import { timeStamp } from "console";
import mongoose, { Schema, model, models } from "mongoose";

export const VIDEO_DIMENTIONS = {
    width: 1080,
    height: 1920
} as const;

export interface IVideo {
    _id?: mongoose.Types.ObjectId,
    title: string,
    desciption: string,
    videoUrl: string,
    thumbnailUrl: string,
    controls: boolean;
    transformation?: {
        height: number;
        width: number;
        quality: number;
    }

}





const videoSchema = new Schema<IVideo>(
    {
        title: { type: String, required: true },
        desciption: { type: String, required: true },
        videoUrl: { type: String, required: true },
        thumbnailUrl: { type: String, required: true },
        controls: { type: Boolean, default: true },
        transformation:{
            height:{
                type:Number,default:VIDEO_DIMENTIONS.height
            },
            width:{
                type:Number,default:VIDEO_DIMENTIONS.width
            },
            quality:{
                type:Number,min:0,max:100
            }
        }
    },
    { 
        timestamps: true
     }
)



const Video = models?.videoSchema || model<IVideo>("Video",videoSchema);
export default Video;