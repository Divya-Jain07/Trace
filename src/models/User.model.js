import mongoose,{Schema} from "mongoose";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';

const UserSchema = new Schema({
    name:
    {
        type: String,
        required:true,   
        trim:true     
    },
    email:
    {
        type:String,
        required: true,
        unique: true,
        trim: true,
        lowercase:true
    },
    password:
    {
        type: String,
        required: true,
    },
    totalSubmissions:
    {
        type: Number,
        required:true,
        default:0
    },
    refreshToken:
    {
        type:String,
        default:null
    }
},
{
    timestamps: true

}
)

UserSchema.pre('save', async function()
{
    if(!this.isModified('password')) return;
    try{
            this.password= await bcrypt.hash(this.password,10);
    }
    catch(err)
    {
       throw err;
    }
})

UserSchema.methods.comparePassword = async function(password){
    return await bcrypt.compare(password,this.password)
}

UserSchema.methods.generateAccessToken =  function()
{
    return jwt.sign({id:this._id, email: this.email},
        process.env.JWT_SECRET_TOKEN,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1h"
        }
    )

}

UserSchema.methods.generateRefreshToken =  function()
{
    return jwt.sign({id:this._id, email: this.email},
        process.env.JWT_SECRET_TOKEN,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "1h"
        }
    )

}

export const User = new mongoose.model('User',UserSchema)