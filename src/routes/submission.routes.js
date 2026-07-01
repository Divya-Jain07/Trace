import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { SubmitCode, getSubmissionStatus, incrementHintUsage } from "../controllers/submission.controller.js"

const router =Router()

router.use(verifyJWT)

router.post('/analyze', SubmitCode)
router.get('/status/:id', getSubmissionStatus)
router.patch('/status/:id/hint', incrementHintUsage)

export default router