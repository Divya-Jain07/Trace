import {User} from "../models/User.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


export const registerUser = asyncHandler(async (req,res)=>{
    const {name,email,password}=req.body;

    if(!name || !email || !password)
        return res.status(400).json(new ApiResponse(400,'All fields are required!'))

    const user = await User.findOne({email})
    if(user)
    {
        return res.status(409).json(new ApiResponse(409,'Email already in use!'))
    }

    const newUser = await User.create({name,email,password})
    const createdUser = await User.findById(newUser._id).select('-password');

    return res.status(201).json(new ApiResponse(201,'User created successfully!',createdUser))
})


export const loginUser = asyncHandler(async (req,res)=>{
    const {email,password}=req.body;

    if(!email || !password)
        return res.status(400).json(new ApiResponse(400,'All fields are required!'))
    
    const user = await User.findOne({email})

    if(!user)
    {
        return res.status(404).json(new ApiResponse(404,'No account found with this email!'))
    }

    const isMatch = await user.comparePassword(password);

    if(!isMatch)
        return res.status(401).json(new ApiResponse(401, 'Incorrect password!'))

    const accessToken = user.generateAccessToken();
    const refreshToken =user.generateRefreshToken();
    user.refreshToken= refreshToken;
    await user.save({validateBeforeSave: false})

    const cookieOptions={
        httpOnly:true,
        secure: process.env.NODE_ENV=='production',
        sameSite: 'strict',
        maxAge: 7*24*60*60*1000//7days in ms
    }

    return res.status(200).cookie('refreshToken',refreshToken,cookieOptions).json(new ApiResponse(200,"login successful",{
        accessToken,
        user:{
            _id:user._id,
            name: user.name,
            email: user.email
        }
    }))
})


export const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,{$set:{
        refreshToken:null
    }})

    return res.status(200).clearCookie('refreshToken',{httpOnly:true, secure: process.env.NODE_ENV=='production' })
    .json(new ApiResponse(200, "User logged successfully!"))
})