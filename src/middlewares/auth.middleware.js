import jwt from 'jsonwebtoken'
import {User} from '../models/User.model.js'
import { ApiResponse } from '../utils/ApiResponse.js'

export const verifyJWT = async(req,res,next)=>{
    try{
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]

        if(!token)
        {
            return res.status(401).json(new ApiResponse(401,'No token provided'))
        }
        const decoded = jwt.verify(token,process.env.JWT_SECRET_TOKEN)

        const user = await User.findById(decoded.id).select('-password');//exclude password field while returning

        if(!user)
        {
            return res.status(401).json(new ApiResponse(401,'User not found'))
        }

        req.user=user;
        next();

    }
    catch(err)
    {
        
        return res.status(401).json(new ApiResponse(401,'Invalid or expired token'))
    }
}