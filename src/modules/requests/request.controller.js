import { StatusCodes } from "http-status-codes";
import { fetchRequest, filterRequestsByStatus, storeRequest } from "./request.service.js";

export const saveRequest = async (req, res) => {
    const data = await storeRequest(req, res);

    res.status(data.statusCode).json(data.data);
};

export const getRequest = async (req, res) => {
    const { id } = req.params;

    const data = await fetchRequest(id);
    res.status(data.statusCode).json(data.data);
}

export const getRequestsWithStatus = async (req, res) => {
    const { status } = req.query;

    const data = await filterRequestsByStatus(status);
    res.status(data.statusCode).json(data.data);
}