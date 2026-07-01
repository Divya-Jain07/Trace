import { Submission } from "../models/Submissions.model.js";
import { generateInsightsSummary } from "../services/gemini.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";


// GET /api/dashboard/history
// Paginated history of all user submissions — strips rawCode and hints for list view
export const getHistory = asyncHandler(async (req, res) => {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // cap at 50
    const skip  = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
        Submission.find({ userId: req.user._id, status: 'completed' })
            .select('-rawCode -analysis.hints')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Submission.countDocuments({ userId: req.user._id, status: 'completed' })
    ]);

    return res.status(200).json(new ApiResponse(200, 'History fetched successfully', {
        submissions,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total
        }
    }));
});


// GET /api/dashboard/insights
// Runs all insight metrics in a single $facet aggregation (one DB round-trip)
// over the 50 most recent completed submissions, then overlays a Gemini coach layer
export const getInsights = asyncHandler(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const [facetResult] = await Submission.aggregate([
        // Scope: only this user's completed submissions, most recent 50
        { $match: { userId, status: 'completed' } },
        { $sort:  { createdAt: -1 } },
        { $limit: 50 },

        {
            $facet: {

                // 1. Which hint categories keep appearing — the error fingerprint
                hintCategoryFrequency: [
                    { $unwind: '$analysis.hints' },
                    { $group: { _id: '$analysis.hints.category', count: { $sum: 1 } } },
                    { $sort:  { count: -1 } }
                ],

                // 2. Approach rating per submission over time — the growth arc
                //    Re-sorted ascending so frontend gets a left-to-right progress line
                approachTrend: [
                    { $sort: { createdAt: 1 } },
                    { $project: {
                        createdAt: 1,
                        approachRating: '$analysis.codeMetrics.approach.rating',
                        severity:       '$analysis.severity'
                    }}
                ],

                // 3. How many hints the user actually clicked/used over time — self-sufficiency trend
                hintCountTrend: [
                    { $sort: { createdAt: 1 } },
                    { $project: {
                        createdAt: 1,
                        hintCount: '$hintsUsed'
                    }}
                ],

                // 4. TLE risk across the window
                tleStats: [
                    { $group: {
                        _id: null,
                        totalTLE: { $sum: { $cond: ['$analysis.performanceWarning.willTLE', 1, 0] } },
                        total:    { $sum: 1 }
                    }}
                ],

                // 5. Severity spread — how bad are things overall
                severityDistribution: [
                    { $group: { _id: '$analysis.severity', count: { $sum: 1 } } },
                    { $sort:  { count: -1 } }
                ],

                // 6. Language usage breakdown
                languageBreakdown: [
                    { $group: { _id: '$language', count: { $sum: 1 } } },
                    { $sort:  { count: -1 } }
                ],

                // 7. Topic-level weakness map — what subjects is the student struggling in
                topicWeaknessMap: [
                    { $unwind: { path: '$analysis.topics', preserveNullAndEmptyArrays: false } },
                    { $group: {
                        _id:             '$analysis.topics',
                        count:           { $sum: 1 },
                        optimalCount:    { $sum: { $cond: [{ $eq: ['$analysis.codeMetrics.approach.rating', 'OPTIMAL']    }, 1, 0] } },
                        suboptimalCount: { $sum: { $cond: [{ $eq: ['$analysis.codeMetrics.approach.rating', 'SUBOPTIMAL'] }, 1, 0] } },
                        incorrectCount:  { $sum: { $cond: [{ $eq: ['$analysis.codeMetrics.approach.rating', 'INCORRECT']  }, 1, 0] } }
                    }},
                    { $sort: { incorrectCount: -1, count: -1 } }
                ],

                // 8. Last 5 submissions — for win detection by Gemini
                //    Already in descending order from outer $sort; $limit gives most recent 5
                recentSubmissions: [
                    { $limit: 5 },
                    { $project: {
                        createdAt:      1,
                        hintCount:      '$hintsUsed',
                        approachRating: '$analysis.codeMetrics.approach.rating',
                        severity:       '$analysis.severity',
                        topics:         '$analysis.topics'
                    }}
                ],

                // 9. Total submissions in this 50-window for Gemini context
                meta: [
                    { $count: 'totalSubmissions' }
                ]
            }
        }
    ]);

    // No completed submissions yet
    if (!facetResult || !facetResult.meta.length) {
        return res.status(200).json(new ApiResponse(200, 'Not enough data for insights yet', {
            rawMetrics: null,
            coachLayer: null
        }));
    }

    const {
        hintCategoryFrequency, approachTrend, hintCountTrend,
        tleStats, severityDistribution, languageBreakdown,
        topicWeaknessMap, recentSubmissions, meta
    } = facetResult;

    const tleData = tleStats[0] || { totalTLE: 0, total: 0 };

    const rawMetrics = {
        totalSubmissions:      meta[0].totalSubmissions,
        hintCategoryFrequency,
        approachTrend,
        hintCountTrend,
        tleStats: {
            totalTLE:   tleData.totalTLE,
            total:      tleData.total,
            percentage: tleData.total > 0
                ? Math.round((tleData.totalTLE / tleData.total) * 100)
                : 0
        },
        severityDistribution,
        languageBreakdown,
        topicWeaknessMap,
        recentSubmissions
    };

    // Overlay Gemini coach layer on top of raw aggregation data
    const coachLayer = await generateInsightsSummary(rawMetrics);

    return res.status(200).json(new ApiResponse(200, 'Insights fetched successfully', {
        rawMetrics,
        coachLayer
    }));
});
