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
         $unset:{
            refreshToken:1
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
   const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
   if(!incomingRefreshToken){
      throw new ApiError(401,"unauthorised request")
   }
  try {
    const decodedToken=jwt.verify(
       incomingRefreshToken,
       process.env.REFRESH_TOKEN_SECRET
    )
   const user= await User.findById(decodedToken?._id)
 
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

const changeCurrentPassword=asyncHandler(async(req,res)=>{
   const {oldPassword,newPassword}=req.body

   const user=await User.findById(req.user?._id)
   const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

   if(!isPasswordCorrect){
      throw new ApiError(400,"invalid old password")
   }

   user.password=newPassword
   await user.save({validateBeforeSave:false})

 return res
 .status(200)
 .json(new ApiResponse(200,{},"Password change succesfully"))


})
const getCurrentUser = asyncHandler(async(req, res) => {
   return res
   .status(200)
   .json(new ApiResponse(
       200,
       req.user,
       "User fetched successfully"
   ))
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
   const {fullname,email}=req.body

   if(!fullname || !email){
      throw new ApiError(400,"All fields are required")
   }

   const user=User.findByIdAndUpdate(
      req.user?._id,
      {
            $set:{
               fullname,
               email:email,
            }
      },
      {new:true}
   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200,user,"Account details updated successfully"))
})
const updateUserAvatar = asyncHandler(async(req, res) => {
   const avatarLocalPath = req.file?.path

   if (!avatarLocalPath) {
       throw new ApiError(400, "Avatar file is missing")
   }

   //TODO: delete old image - assignment
   if (user.avatar) {
      const oldPublicId = user.avatar.split('/').pop().split('.')[0]; // Extract public ID
      await cloudinary.uploader.destroy(oldPublicId); // Delete old avatar
  }


   const avatar = await uploadOnCloudinary(avatarLocalPath)

   if (!avatar.url) {
       throw new ApiError(400, "Error while uploading on avatar")
       
   }

   const user = await User.findByIdAndUpdate(
       req.user?._id,
       {
           $set:{
               avatar: avatar.url
           }
       },
       {new: true}
   ).select("-password")

   return res
   .status(200)
   .json(
       new ApiResponse(200, user, "Avatar image updated successfully")
   )
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
   const coverImageLocalPath=req.file?.path
   if(!coverImageLocalPath){
      throw new ApiError(400,"coverImage file is missing")
   }
   const coverImage=await uploadOnCloudinary(coverImageLocalPath)

   if(!coverImage.url){
      throw new ApiError(400,"Error while uploading coverImage")
   }

   const user=await User.findByIdAndUpdate(
      req.user?._id,
      {$set:{
         coverImage:coverImage.url
      }},
      {new:true}
   ).select("-password")

   return res
   .status(200)
   .json(
      new ApiResponse(200,user,"cover image is updated")
   )
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
     const {username}=req.params
     if(!username?.trim()){
      return ApiError(400,"username is required")
     }
   const channel=await User.aggregate([
      {
         $match:{
            username: username?.toLowerCase()
         }
      },
      {
         $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
         }
      },
      {
         $lookup:{
         from:"subscriptions",
         localField:"_id",
         foreignField:"subscriber",
         as:"subscribedTo"
         }
      },
      {
         $addFields:{
            subscribersCount:{
                  $size:"$subscribers"
            },
            channelSubscribedToCount:{
               $size:"$subscribedTo"
            },
            isSubscribed:{
               $cond:{
                  if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                  then:true,
                  else:false 
               }
            }
         }
      },
      {
         $project:{
            fullname:1,
            username:1,
            subscribersCount:1,
            channelSubscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
         }
      }
])
if(!channel?.length){
   throw new ApiError(404,"Channel does not exist")
}

return res
.status(200)
.json(
   new ApiResponse(200,channel[0],"user channel fetched succesfully")
)
})
const getWatchHistory=asyncHandler(async(req,res)=>{
   const user=await User.aggregate([
      {
         $match:{
            _id:new mongoose.Types.ObjectId(req.user._id)
         }
      },
      {
         $lookup:{
            from:"videos",
            localField:"watchHistory",
            foreignField :"id",
            as: "watchHistory",
            pipeline:[
               {
                  $lookup:{
                     from:"users",
                     localField:"owner",
                     foreignField: "_id",
                     as:"owner",
                     pipeline:[
                        {
                           $project:{
                              fullname:1,
                              username:1,
                              avatar:1
                           }
                        }
                     ]
                  }
               },
               {
                  $addFields:{
                     owner:{
                        $first:"owner"
                     }
                  }
               }
            ]
         }
      }
   ])

   return res
   .status(200)
   .json(
      new ApiResponse(
         200,
         user[0].watchHistory,
         "Watch history getched successfully"
      )
   )
})
export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory}