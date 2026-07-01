import jwt from 'jsonwebtoken'
import {User} from '../models/User.model.js'
import { ApiResponse } from '../utils/ApiResponse.js'

export const verifyJWT = async(req,res,next)=>{
    try{
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]

        if(!token) {
            return res.status(401).json(new ApiResponse(401,'No token provided'))
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET_TOKEN)
        } catch (error) {
            // If access token is expired, try auto-refreshing using the cookie
            if (error.name === 'TokenExpiredError') {
                const refreshToken = req.cookies?.refreshToken;
                if (!refreshToken) {
                    return res.status(401).json(new ApiResponse(401, 'Session expired. Please log in again.'));
                }

                try {
                    const refreshDecoded = jwt.verify(refreshToken, process.env.JWT_SECRET_TOKEN);
                    const user = await User.findById(refreshDecoded.id).select('-password');
                    
                    if (!user || user.refreshToken !== refreshToken) {
                        return res.status(401).json(new ApiResponse(401, 'Invalid session. Please log in again.'));
                    }
                    
                    // Generate new access token and attach to response header
                    const newAccessToken = user.generateAccessToken();
                    res.setHeader('x-access-token', newAccessToken);
                    
                    req.user = user;
                    return next(); // Proceed with the request transparently
                } catch (refreshErr) {
                    return res.status(401).json(new ApiResponse(401, 'Refresh token expired. Please log in again.'));
                }
            }
            return res.status(401).json(new ApiResponse(401,'Invalid token'))
        }

        const user = await User.findById(decoded.id).select('-password');

        if(!user) {
            return res.status(401).json(new ApiResponse(401,'User not found'))
        }

        req.user=user;
        next();
    }
    catch(err) {
        return res.status(401).json(new ApiResponse(401,'Authentication failed'))
    }
}