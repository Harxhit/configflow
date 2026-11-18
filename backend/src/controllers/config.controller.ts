import { Request, Response } from "express"
import fs from 'fs/promises'
import { createReadStream } from "node:fs";
import path from 'node:path'
import { createSlotValidator, filenameValidator, updateConfigValidator } from "../validators/config.validator"
import { decodeMsgFile, encodeMsgFile, validateConfig, validateUpdatePaths, validateUpdateTypes, isNonNegativeNumber} from "../utils/config"
import { Config } from "../types/config.types"
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile)

export const folderPath  = path.resolve('./storage/msgpack')
export const videoDirectory  = path.resolve('./storage/videos')
export const thumbnailDirectory = path.resolve('./storage/thumbnails')

const getAllConfigFiles = async(_request: Request, response: Response) => {
    try {
        const entries = await fs.readdir(folderPath, {withFileTypes:true})
        const files = entries.filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.msgpack')).map(entry => entry.name)

        return response.status(200).json({
            success: true, 
            message: '.msgPack files fetched', 
            files
        }); 
    } catch (error) {
        console.error('Internal server erorr',error)

        return response.status(500).json({
            success: false, 
            message: "Internal server error"
        })
    }
}

const getFile = async(request: Request, response: Response) => {
    try {
        const {error, value} = filenameValidator.validate(request.params.fileName)

        if(error){
            console.error('Validation error')

            return response.status(400).json({
                success: false,
                message: error.details[0].message,
                path: error.details[0].path,
            });
        }

        const fileName = value

        const entries = await fs.readdir(folderPath, {withFileTypes: true})

        const file = entries.find(enrty => enrty.isFile() && enrty.name.toLowerCase() === fileName.toLowerCase())
        if(!file){
            return response.status(404).json({
                success : false, 
                message: 'File not found'
            })
        }

        const decodedFile = await decodeMsgFile(file.name)

        return response.status(200).json({
            success: true, 
            message: 'File found successfully', 
            decodedFile
        })

    } catch (error) {
        console.error('Internal server error',error)

        return response.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

const updateConfigField = async(request: Request, response: Response) => {
    try {
        const {error, value} = updateConfigValidator.validate(request.body)
        if(error){
            console.error('Validation error')

            return response.status(400).json({
                success: false,
                message: error.details[0].message,
                path: error.details[0].path,
            });
        }
        const fileName = request.params.fileName

        if(typeof fileName !== 'string'){
            return response.status(400).json({
                success: false,
                message: "Invalid filename"
            });
        }
        const {updates} = value
        const data = await decodeMsgFile(fileName)

        validateUpdatePaths(data, updates)
        validateUpdateTypes(data, updates)

        for(const update of updates){
            const parentPath = update.path.slice(0,-1)
            const lastKey = update.path[update.path.length - 1]

            
            const parent = parentPath.reduce(
                (current: any, key: string | number) => current[key],
                data as any
            );
            parent[lastKey] = update.value
        }


        validateConfig(data)
        await encodeMsgFile(fileName, data)

        return response.status(200).json({
            success: true,
            message: "Configuration updated successfully",
            data
        });

    } catch (error) {
        console.error('Internal server error', error)
        return response.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

const addSlots = async(request: Request, response: Response) => {
    try {
        const {error, value} = createSlotValidator.validate(request.body)
        if(error){
            console.error('Validation error')

            return response.status(400).json({
                success: false,
                message: error.details[0].message,
                path: error.details[0].path,
            });
        }

        const fileName = request.params.fileName
        if(typeof fileName !== 'string'){
            return response.status(400).json({
                success: false,
                message: "Invalid filename"
            });
        }
        const {position, interaction, tags} = value.slot
        const id = crypto.randomUUID() 
        const data = await decodeMsgFile(fileName) as Config

        const newSlot = {
            id, 
            position, 
            interaction, 
            tags
        }
        data.slots.push(newSlot)

        console.log(
            data.slots.map((slot, index) => ({
                index,
                x: slot.position.x,
                type: typeof slot.position.x,
                isFinite: Number.isFinite(slot.position.x),
            }))
        );

        validateConfig(data)

        await encodeMsgFile(fileName, data)

        return response.status(201).json({
            success: true,
            message: "Slot added successfully",
            slot: newSlot,
        });


    } catch (error) {
        console.error("Internal server error",error)

        return response.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

const getVideo = async (request: Request, response: Response) => {
  try {
    const uuid = request.params.uuid;

    if (typeof uuid !== "string") {
      return response.status(400).json({
        success: false,
        message: "Invalid UUID",
      });
    }

    const videoPath = path.join(videoDirectory, `${uuid}.mp4`);
    console.log("VideoPath", videoPath)
    let stat;

    try {
      stat = await fs.stat(videoPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return response.status(404).json({
          success: false,
          message: "Video not found",
        });
      }
      throw error;
    }

    const fileSize = stat.size;
    const range = request.headers.range;

    response.setHeader("Content-Type", "video/mp4");
    response.setHeader("Accept-Ranges", "bytes");

    if (!range) {
      response.setHeader("Content-Length", fileSize);
      return createReadStream(videoPath).pipe(response);
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = Number(parts[0]);
    const end = parts[1] ? Number(parts[1]) : fileSize - 1;

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      start >= fileSize ||
      end < start ||
      end >= fileSize
    ) {
      response.setHeader("Content-Range", `bytes */${fileSize}`);
      return response.status(416).end();
    }

    response.status(206);
    response.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    response.setHeader("Content-Length", end - start + 1);

    return createReadStream(videoPath, { start, end }).pipe(response);
  } catch (error) {
    console.error("Video streaming error:", error);

    if (!response.headersSent) {
      return response.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }

    return response.end();
  }
};

const generateVideoThumbnail = async (request: Request, response: Response) => {
    try {
        const uuid = request.params.uuid 
        if(typeof uuid !== 'string'){
            return response.status(400).json({
                success: false,
                message: "Invalid filename"
            });
        }

        const entries = await fs.readdir(thumbnailDirectory, {withFileTypes: true})

        const file = entries.find((f) => f.name.toLowerCase() === `${uuid.toLowerCase()}.jpg`)

        if(!file){

            const videoEntries = await fs.readdir(videoDirectory, {withFileTypes: true})
            const videoDetails = videoEntries.find((f) => f.name.toLowerCase() === `${uuid.toLowerCase()}.mp4`)
            
            if(!videoDetails){
                return response.status(404).json({
                    success: false, 
                    message: "Video path does not exist"
                })
            }
            const thumbnailPath = path.join(thumbnailDirectory, `${uuid}.jpg`);
            const videoPath = path.join(videoDirectory, videoDetails.name)

            await execFileAsync('ffmpeg', [
                "-y",
                "-ss", "1",
                "-i", videoPath,
                "-frames:v", "1",
                "-q:v", "2",
                thumbnailPath,
            ])

            await fs.access(thumbnailPath);

            return response.sendFile(thumbnailPath);
        }

        const thumbnailPath = path.join(thumbnailDirectory, file.name)
        return response.sendFile(thumbnailPath);
    } catch (error) {
        console.error("Internal server error",error)

        return response.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

export {getAllConfigFiles, getFile, updateConfigField, addSlots, getVideo, generateVideoThumbnail}