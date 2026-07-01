import { GoogleGenerativeAI } from "@google/generative-ai";
console.log('API Key loaded:', process.env.GEMINI_API_KEY ? 'Yes' : 'No');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)



const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

export const analyseCode = async (rawCode, language) => {
    try {
        const prompt = `
            You are an expert Code Architect and Reviewer.
            Analyze the following ${language} code.

            CRITICAL RULES:
            1. DO NOT provide a complete code rewrite.
            2. Be EXTREMELY concise. Keep your feedback precise and to the point.
            3. Restrict explanations for each field to 1-2 short sentences maximum. No fluff or boilerplate text.

            Code to analyze:
            \`\`\`${language}
            ${rawCode}
            \`\`\`

            HINTS RULE:
            - Identify all distinct issues in the code.
            - For each level (1, 2, 3), produce ONE hint per issue found.
            - This means each level can have one or more hints depending on how many issues exist.
            - Example: 3 issues found → 3 hints at level 1, 3 at level 2, 3 at level 3 (9 total).
            - All hints addressing the same issue must share the same category across all levels.
            - Level 1 = gentle nudge, Level 2 = more specific, Level 3 = direct pointer to the fix.

            Respond ONLY with a valid JSON object matching exactly this schema:
            {
              "timeComplexity": "string (e.g., 'O(n) - linear scan of array')",
              "spaceComplexity": "string (e.g., 'O(1) - no extra space used')",
              "codeMetrics": {
                "style": {
                  "rating": "one of: EXCELLENT | ACCEPTABLE | NEEDS_IMPROVEMENT",
                  "feedback": "string (Max 2 sentences on naming, structure, readability)"
                },
                "approach": {
                  "rating": "one of: OPTIMAL | SUBOPTIMAL | INCORRECT",
                  "feedback": "string (Max 2 sentences on algorithmic approach and suggestions)"
                }
              },
              "severity": "one of: CRITICAL | HIGH | MEDIUM | LOW",
              "performanceWarning": {
                "willTLE": "boolean - true ONLY if the time complexity is suboptimal and would cause a Time Limit Exceeded (TLE) under standard 1-second constraints for this specific language (Assume C++/Java/Rust can do ~10^8 ops/sec, while Python/JavaScript can do ~10^7 ops/sec).",
                "thresholdInputSize": "string or null - calculate the input size N where operations exceed this language's 1-second limit. (e.g., In Python (10^7 ops limit), an O(n^2) algorithm breaks around 'n > 3000'. In C++ (10^8 ops limit), it breaks around 'n > 10000'). Provide only if willTLE is true.",
                "symptom": "string or null (e.g., 'In Python, an O(n^2) approach will require 10^10 operations for N=10^5, which far exceeds the ~10^7 ops/sec limit.')"
              },
              "hints": [
                {
                  "level": 1,
                  "category": "one of: LOGIC_ERROR | TIME_COMPLEXITY | SPACE_COMPLEXITY | EDGE_CASE | ALGORITHMIC_PATTERN | DATA_STRUCTURE | OPTIMIZATION_TECHNIQUE | CONSTRAINT_AWARENESS",
                  "clue": "string — subtle, does NOT give away the answer. Just a gentle observation.",
                  "guidingQuestion": "string — a soft question that nudges the student to notice the issue themselves"
                },
                {
                  "level": 2,
                  "category": "same category as level 1 for this issue",
                  "clue": "string — more specific than level 1. Points closer to where the problem is.",
                  "guidingQuestion": "string — a more focused question that narrows down the fix"
                },
                {
                  "level": 3,
                  "category": "same category as level 1 for this issue",
                  "clue": "string — direct. Names the problem and the fix approach clearly.",
                  "guidingQuestion": "string — a direct question whose answer IS the solution"
                }
              ],
              "topics": ["array of lowercase_snake_case strings identifying CS topics this code involves. Use consistent naming — prefer: dynamic_programming, binary_search, graphs, arrays, trees, recursion, sorting, hashing, stack, queue, greedy, linked_list, strings, two_pointers, sliding_window, backtracking, bit_manipulation, math. You may add clearly distinct topics not in this list. Return empty array if no clear topic."]
            }
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text();

        // cleaning the data received
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(text);
        return analysis;

    }
    catch (err) {
        console.log('Gemini analysis error', err);
        throw new Error("Failed to analyse the code!");
    }
}


export const generateInsightsSummary = async (insightsData) => {
    try {
        const prompt = `
            You are an AI Code Coach for a student developer using Trace, a code analysis platform.
            The student is an irregular user — they mostly show up when their code breaks or needs optimization.

            Here is aggregated data from their last ${insightsData.totalSubmissions} code submissions:

            ${JSON.stringify(insightsData, null, 2)}

            Based on this data, respond ONLY with a valid JSON object matching exactly this schema:
            {
              "biggestBlindspot": {
                "category": "string — the single most recurring problem category from hintCategoryFrequency",
                "diagnosis": "string — 1-2 sentences on WHY this keeps happening based on the data",
                "habit": "string — one concrete habit or question the student should adopt before coding next time"
              },
              "overallProgressNote": "string — 2-3 sentences honestly assessing the student's trajectory. Reference actual numbers. Don't sugarcoat but don't demotivate.",
              "topicWeaknesses": [
                {
                  "topic": "string — topic name from topicWeaknessMap",
                  "coachNote": "string — 1 sentence on what's going wrong in this topic",
                  "recommendation": "string — one concrete, actionable next step"
                }
              ],
              "winToHighlight": "string — one specific positive signal from the data worth celebrating. Must reference actual numbers or patterns from the data. Return null if no meaningful win exists."
            }

            RULES:
            1. Be honest but encouraging. Don't sugarcoat, but don't demotivate.
            2. Always reference actual numbers from the data (e.g. "5 of your last 10 submissions had TLE risk").
            3. Keep all strings concise — max 2 sentences each.
            4. topicWeaknesses: only include topics where incorrectCount or suboptimalCount is high relative to count. Return empty array [] if no clear topic weakness.
            5. winToHighlight must be specific to this student's actual data — not generic praise.
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    }
    catch (err) {
        console.log('Gemini insights summary failed!', err);
        throw new Error('Failed to generate insights summary');
    }
}
