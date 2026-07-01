import { analyseCode } from "../services/gemini.service.js";
import { Submission } from "../models/Submissions.model.js";
import {User} from "../models/User.model.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"


export const SubmitCode = asyncHandler( async(req,res)=>{
        const {rawCode,language}=req.body;

        if(!rawCode || !language) 
            return res.status(401).json(new ApiResponse(401,"Provide both details - rawCode and language"))

        const submission = await Submission.create({
            userId: req.user._id,
            language:language,
            rawCode: rawCode,
            status:'pending'
        })

        submissionBackgroundCheck(rawCode,language,req.user._id,submission._id);

        return res.status(202).json(new ApiResponse(202,"submission accepted for processing",{
            submissionId:submission._id
        }))
})



const submissionBackgroundCheck= async(rawCode,language,userId,submissionId)=>{
    try{
        await Submission.findByIdAndUpdate(submissionId, {status: 'processing'})

        let analysis = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                analysis = await analyseCode(rawCode, language);
                break; // If successful, break out of the retry loop
            } catch (error) {
                attempts++;
                console.log(`Gemini analysis attempt ${attempts} failed for submission ${submissionId}:`, error.message);
                
                if (attempts >= maxAttempts) {
                    throw new Error(`Failed to analyze code after ${maxAttempts} attempts`);
                }
                
                // Wait before retrying (Exponential backoff: 1s, 2s)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
        }

        await Submission.findByIdAndUpdate(submissionId, {
            $set:{
                status: 'completed',
                analysis: analysis
            }
        })

        await User.findByIdAndUpdate(userId,{
            $inc: {totalSubmissions: 1}
        })
        
    }
    catch(err){
        console.log(`Background Job failed for submission ${submissionId}:`,err)

        await Submission.findByIdAndUpdate(submissionId,{status:'failed'})
    }
}


export const getSubmissionStatus = asyncHandler(async (req,res)=>
{
    const {id} = req.params;
    const submission= await Submission.findById(id);

    if(!submission)
        return res.status(404).json(new ApiResponse(404,'Submission not found!'))

    if(submission.userId.toString()!=req.user._id.toString())
        return res.status(403).json(new ApiResponse(403,'Not authorised to view the solution'))

    return res.status(200).json(new ApiResponse(200,'Submission status fetched',submission))
})


export const incrementHintUsage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const submission = await Submission.findById(id);

    if (!submission) {
        return res.status(404).json(new ApiResponse(404, 'Submission not found!'));
    }

    if (submission.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json(new ApiResponse(403, 'Not authorised'));
    }

    // Only increment if we haven't exceeded total hints available (prevents spamming)
    const maxHints = submission.analysis?.hints?.length || 0;
    if (submission.hintsUsed < maxHints) {
        submission.hintsUsed += 1;
        await submission.save();
    }

    return res.status(200).json(new ApiResponse(200, 'Hint usage recorded', { hintsUsed: submission.hintsUsed }));
});