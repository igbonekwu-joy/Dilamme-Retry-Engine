import { StatusCodes } from "http-status-codes";
import { storeRequest } from "./request.service.js";

export const saveRequest = async (req, res) => {
    const data = await storeRequest(req, res);

    res.status(data.statusCode).json(data.data);
};