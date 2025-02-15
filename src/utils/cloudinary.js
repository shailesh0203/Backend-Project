import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

console.log("Cloudinary ENV Vars:", {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: "672712912193498" ? "Exists" : "MISSING",
    api_secret: "8caIAtLXj32eHqYNjXTLQUTQHIs" ? "Exists" : "MISSING"
});cloudinary.config({ 
  cloud_name: "df2znsu3o", 
  api_key: "672712912193498", 
  api_secret: "8caIAtLXj32eHqYNjXTLQUTQHIs" 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath)
        return response;

    } catch (error) {
        const uploadResult = await cloudinary.uploader
        .upload(
            'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
                public_id: 'shoes',
            }
        )
        .catch((error) => {
            console.log(error);
        });
     
     console.log(uploadResult);
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}



export {uploadOnCloudinary}