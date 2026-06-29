import mongoose,{Schema} from "mongoose";

const analysisSchema = new Schema({
    timeComplexity:
    {
        type:String,
        required: true
    },
    spaceComplexity:
    {
        type:String,
        required: true
    },
    codeStyle:
    {
        type:String,
        required: true
    },
    codeApproach:
    {
        type:String,
        required: true
    }
},{
    _id: false //dont generate another id for this
})


const SubmissionSchema = new Schema({
    userID:
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
