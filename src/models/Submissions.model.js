import mongoose,{Schema} from "mongoose";

const analysisSchema = new Schema({
    timeComplexity: { 
        type: String, 
        required: true
    }, 
    spaceComplexity: { 
        type: String, 
        required: true
    },
    codeMetrics: {
        style: {
            rating: { 
                type: String, 
                enum: ['EXCELLENT', 'ACCEPTABLE', 'NEEDS_IMPROVEMENT'],
                required: true 
            },
            feedback: { 
                type: String, 
                required: true
            }
        },
        approach: {
            rating: { 
                type: String, 
                enum: ['OPTIMAL', 'SUBOPTIMAL', 'INCORRECT'],
                required: true 
            },
            feedback: { 
                type: String, 
                required: true
            }
        },
        _id: false
    },
    severity: {
        type: String,
        enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
        required: true
    },
    performanceWarning: {
        willTLE: { 
            type: Boolean, 
            required: true
        },
        thresholdInputSize: { 
            type: String,
            required: false
        },
        symptom: { 
            type: String,
            required: false
        },
        _id: false
    },
    topics: {
        type: [String],
        default: []
    },
    hints: [{
        level: { 
            type: Number, 
            enum: [1, 2, 3],
            required: true
        },
        category: { 
            type: String, 
            enum: [
                'LOGIC_ERROR',
                'TIME_COMPLEXITY',
                'SPACE_COMPLEXITY',
                'EDGE_CASE',
                'ALGORITHMIC_PATTERN',
                'DATA_STRUCTURE',
                'OPTIMIZATION_TECHNIQUE',
                'CONSTRAINT_AWARENESS'
            ],
            required: true 
        },
        clue: { 
            type: String, 
            required: true
        },
        guidingQuestion: { 
            type: String, 
            required: true
        },
        _id: false
    }],
     
    },
{
    _id: false
});



const SubmissionSchema = new Schema({
    userId:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    language:
    {
        type:String,
        required: true,
        trim:true
    },
    rawCode:
    {
        type:String,
        required: true
    },
    status:
    {
        type:String,
        enum:['pending','processing','completed','failed'],
        required: true,
        default:'pending'
    },
    analysis:
    {
        type:analysisSchema,
        default: null
    },
    hintsUsed:
    {
        type: Number,
        default: 0
    }
},
{
    timestamps:true
}
);

//compound index--> presort the data using B-tree structure
//index:1 ==> grp all submissions by UserId in ascending order
//createdAt:-1 ==> inside each user grp, sort their submission by descending order
SubmissionSchema.index({index:1, createdAt: -1})


export const Submission = new mongoose.model('Submission',SubmissionSchema)
