import {asyncHandler} from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js';
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken=async(userId)=>{
   try{
      const user=await User.findById(userId)
      const accessToken=user.generateAccessToken()
      const refreshToken=user.generateRefreshToken()

      user.refreshToken=refreshToken
     await user.save({validateBeforeSave:false})
      
     return {accessToken,refreshToken}
   }catch(error){
      throw new ApiError(500,"Something went wrong while generating refresh token and access token")
   }
}
const registerUser=asyncHandler(async(req,res)=>{
   /* res.status(200).json({
        message:"ok"
    })*/
   //get user details from frontend
   //validations->not empty
   //check if user already exist:username,email
   //check for images,check for avatar
   //upload them to cloudinary avatar
   //create user object- create entry in db
   //remove password and refresh token field from response
   //check for user creation
   //return res

   const {fullname,username,email,password}=req.body
   console.log(email,fullname,username,password);

   /*if(fullname===""){
      throw new ApiError(400,"fullname is required")
   }*/
  if([fullname,email,username,password].some((field)=>field?.trim()==="")){
   throw new ApiError(400,"all fields are required")
  }

const existedUser=await User.findOne({
   $or: [{username},{email}]
})
if(existedUser){
   throw new ApiError(409,"User with email or username already exist")
}
const avatarLocalPath=req.files?.avatar[0]?.path
console.log(avatarLocalPath)
const coverImageLocalPath=req.files?.coverImage?.[0]?.path
if(!avatarLocalPath){
   throw new ApiError(400,"Avtar file is required")
}
const avatar=await uploadOnCloudinary(avatarLocalPath)
const coverImage=await uploadOnCloudinary(coverImageLocalPath)
if(!avatar){
   throw new ApiError(400,"Avtar file is required")
}
const user=await User.create({
   fullname,
   avatar:avatar.url,
   coverImage:coverImage?.url || "",
   email,
   password,
   username:username.toLowerCase()
})

const createdUser=await User.findById(user._id).select(
   "-password -refreshToken"
)
if(!createdUser){
   throw new ApiError(500,"something went wrong while registering the user")
}
return res.status(201).json(
   new ApiResponse(200,createdUser,"user registered succesfully")
)
})
const loginUser=asyncHandler(async(req,res)=>{
//take data from user,req.body
//check if he filled all the credentials
//check if it exist in the database
//match the password
//generate access and refresh tokenn
//send cookie
const {email,username,password}=req.body

if(!username && !email){
   throw new ApiError(400,"username or email is reqired")
}

const user=await User.findOne({
   $or: [{username},{email}]
})
if(!user){
   throw new ApiError(404,"User doen't exist")
}
const isPasswordValid=await user.isPasswordCorrect(password)
if(!isPasswordValid){
   throw new ApiError(404,"invalid password")
}

const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

const loggedInUser=await User.findById(user.id).select("-password -refreshToken")
const options={
   httpOnly:true,
   secure:true
}
return res
.status(200)
.cookie("accessToken",accessToken,options)
.cookie("refreshToken",refreshToken,options)
.json(
   new ApiResponse(
      200,
      {
         user:loggedInUser, accessToken,
         refreshToken
      },
      "user logged in succesfully"
   )
)


})
const logoutUser=asyncHandler(async(req,res)=>{
   //clear the cookies
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $set:{
            refreshToken:undefined
         }
      },
      {
         new:true
      }
   )
   const options={
      httpOnly:true,
      secure:true
   }

   return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(new ApiResponse(200,{
   },"User logged out"))
})

const refreshAccessToken=asyncHandler(async(req,res)=>{
   const incomingRefreshToken=req.cookies.refreshAccessToken || req.body.refreshToken
   if(incomingRefreshToken){
      throw new ApiError(401,"unauthorised request")
   }
  try {
    const decodedToken=jwt.verify(
       incomingRefreshToken,
       process.env.REFRESH_TOKEN_SECRET
    )
   const user= await User.findById(decodedToken?.id)
 
   if(!user){
    throw new ApiError(401,"invalid refreshToken")
   }
   if(incomingRefreshToken!==user?.refreshToken){
    throw new ApiError(401,"Refresh token is expired or used")
   }
 
   const options={
    httpOnly:true,
    secure:true
   }
 
  const {accessToken,newRefreshToken}=await  generateAccessAndRefreshToken(user._id)
 
  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",newRefreshToken,options)
  .json(
    new ApiResponse(
       200,
       {accessToken,refreshToken:newRefreshToken},
       "Access token refreshed"
    )
  )
  } catch (error) {
   throw new ApiError(401,error?.message || "invalid refresh token")
  }
})

export {registerUser,loginUser,logoutUser,refreshAccessToken}