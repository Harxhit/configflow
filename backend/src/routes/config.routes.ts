import { Router } from "express";
import { addSlots, getAllConfigFiles, getFile , updateConfigField, getVideo, generateVideoThumbnail} from "../controllers/config.controller";
import authMiddleWare from "../middleware/auth.middleware";

const configRoutes = Router()

configRoutes.get('/all', authMiddleWare, getAllConfigFiles)

configRoutes.get('/:fileName', authMiddleWare, getFile)

configRoutes.patch("/:fileName", authMiddleWare, updateConfigField);

configRoutes.post("/slot/:fileName", authMiddleWare, addSlots);

configRoutes.get("/video/:uuid",authMiddleWare,  getVideo);

configRoutes.get("/thumb/:uuid", authMiddleWare,  generateVideoThumbnail);

export default configRoutes