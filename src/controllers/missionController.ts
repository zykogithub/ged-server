import type { Request, Response } from 'express';
import { e } from '@utils/logs';
import type {Mission, MissionTask, MissionReport} from '@models/mission';
import MissionRepository from '@repositories/missionRepository';
import ImageRepository from '@repositories/imageRepository';
import {
    oracleErrorResponse,
    badRequestErrorResponse,
    internalServerErrorResponse
} from '@utils/errorUtils';
import {Readable} from 'stream';
import type {ServerResponse} from '@models/serverResponse';

const missionRepository = new MissionRepository();
const imageRepository = new ImageRepository();

export const getMissions = async (req: Request, res: Response): Promise<void> => {
    const missionTest = req.claims?.tester ?? false;

    try {
        const result = await missionRepository.getMissions(missionTest);
        res.status(200).json(result);
    } catch (error: any) {
        e(new Error(`Error getting missions: ${error.message}`));
        res.status(500).json(oracleErrorResponse(error));
    }
}

export const createMission = async (req: Request, res: Response): Promise<void> => {
    const missionTest = req.claims?.tester ?? false;
    const missionJson = req.body.mission;
    const imageFile = req.file;
    const {
        MISSION_ID: id,
        MISSION_TITLE: title,
        MISSION_DESCRIPTION: description,
        MISSION_SCHOOL_LEVELS: schoolLevels,
        MISSION_DATE: date,
        MISSION_START_DATE: startDate,
        MISSION_END_DATE: endDate,
        MISSION_DURATION: duration,
        MISSION_MANAGER_IDS: managerIds,
        MISSION_MAX_PARTICIPANTS: maxParticipants,
        MISSION_TASKS: tasks,
        MISSION_IMAGE_FILE_NAME: imageFileName
    } = JSON.parse(missionJson);

    if(
        !id ||
        !title ||
        !description ||
        !schoolLevels ||
        !date ||
        !startDate ||
        !endDate ||
        !managerIds ||
        !maxParticipants
    ) {
        res.status(400).json(badRequestErrorResponse);
        return;
    }

    const mission: Mission = {
        id: id,
        title: title,
        description: description,
        schoolLevels: schoolLevels,
        date: date,
        startDate: startDate,
        endDate: endDate,
        duration: duration,
        maxParticipants: maxParticipants,
        imageFileName: imageFileName,
        test: missionTest
    };

    const missionTasks: MissionTask[] = JSON.parse(tasks).map((task: any): MissionTask => ({
        id: task.MISSION_TASK_ID,
        value: task.MISSION_TASK_VALUE
    }));

    const missionManagerIds: string[] = JSON.parse(managerIds);

    try {
        await missionRepository.createMission(mission, missionManagerIds, missionTasks);
        if (imageFile) {
            await imageRepository.uploadImage(
                Readable.from(imageFile.buffer),
                getImagePath(imageFile.originalname),
                imageFile.size
            );
        }

        const serverResponse: ServerResponse = { message: `Mission has been created successfully` };
        res.status(201).json(serverResponse);
    } catch (error: any) {
        e(new Error(`Error creating mission ${mission.id} : ${error.message}`));
        res.status(500).json(oracleErrorResponse(error));
    }
}

export const updateMission = async (req: Request, res: Response): Promise<void> => {
    const missionTest = req.claims?.tester ?? false;
    const missionJson = req.body.mission;
    const imageFile = req.file;
    const {
        MISSION_ID: id,
        MISSION_TITLE: title,
        MISSION_DESCRIPTION: description,
        MISSION_SCHOOL_LEVELS: schoolLevels,
        MISSION_DATE: date,
        MISSION_START_DATE: startDate,
        MISSION_END_DATE: endDate,
        MISSION_DURATION: duration,
        MISSION_MANAGER_IDS: managerIds,
        MISSION_MAX_PARTICIPANTS: maxParticipants,
        MISSION_TASKS: tasks,
        MISSION_IMAGE_FILE_NAME: imageFileName
    } = JSON.parse(missionJson);

    if(
        !id ||
        !title ||
        !description ||
        !schoolLevels ||
        !startDate ||
        !endDate ||
        !managerIds ||
        !maxParticipants
    ) {
        res.status(400).json(badRequestErrorResponse);
        return;
    }

    const mission: Mission = {
        id: id,
        title: title,
        description: description,
        schoolLevels: schoolLevels,
        date: date,
        startDate: startDate,
        endDate: endDate,
        duration: duration,
        maxParticipants: maxParticipants,
        imageFileName: imageFileName,
        test: missionTest
    };
    let previousMission: Mission | null = null;

    try {
        previousMission = await missionRepository.getMission(mission.id)
        const previousMissionManagerIds = await missionRepository.getMissionManagers(mission.id)
            .then(managers => managers.map(m => m.userId));
        const previousMissionManagerIdsSet = new Set(previousMissionManagerIds);
        const newMissionManagerIds: string[] = JSON.parse(managerIds);
        const newMissionManagerIdsSet = new Set(newMissionManagerIds);
        const missionManagerIdsToDelete = previousMissionManagerIds.filter(managerId => !newMissionManagerIdsSet.has(managerId));
        const missionManagerIdsToAdd = newMissionManagerIds.filter(managerId => !previousMissionManagerIdsSet.has(managerId));

        const previousMissionTasks = await missionRepository.getMissionTasks(mission.id);
        const previousMissionTaskMap = new Map(previousMissionTasks.map(task => [task.id, task]));
        const newMissionTasks: MissionTask[] = JSON.parse(tasks).map((task: any): MissionTask => ({
            id: task.MISSION_TASK_ID,
            value: task.MISSION_TASK_VALUE
        }));
        const newMissionTaskMap = new Map(newMissionTasks.map(task => [task.id, task]));
        const missionTasksToDelete = previousMissionTasks.filter(task => !newMissionTaskMap.has(task.id));
        const missionTasksToAdd = newMissionTasks.filter(task => !previousMissionTaskMap.has(task.id));

        const missionParticipantUsers = await missionRepository.getMissionParticipantUsers(mission.id);
        const newMissionSchoolLevels = new Set<number>(JSON.parse(mission.schoolLevels));
        const missionParticipantIdsToDelete = missionParticipantUsers
            .filter(user => !newMissionSchoolLevels.has(user.schoolLevel))
            .map(user => user.userId);

        await missionRepository.updateMission(
            mission,
            missionManagerIdsToDelete,
            missionManagerIdsToAdd,
            missionTasksToDelete,
            missionTasksToAdd,
            missionParticipantIdsToDelete
        );
        if (imageFile) {
            await imageRepository.uploadImage(
                Readable.from(imageFile.buffer),
                getImagePath(imageFile.originalname),
                imageFile.size
            );
        }

        const serverResponse: ServerResponse = { message: 'Mission has been updated successfully'};
        res.status(201).json(serverResponse);

        const previousImageFileName = previousMission?.imageFileName;
        if (previousImageFileName && previousImageFileName != mission.imageFileName) {
            await imageRepository.deleteImage(getImagePath(previousImageFileName))
                .catch(error =>
                    e(new Error(`Error deleting previous mission image ${previousImageFileName}: ${error.message}`))
                );
        }
    } catch (error: any) {
        e(new Error(`Error updating mission ${mission.id}: ${error.message}`));
        res.status(500).json(oracleErrorResponse(error));
        return;
    }
}

export const deleteMission = async (req: Request, res: Response): Promise<void> => {
    const missionTest = req.claims?.tester ?? false;
    const {
        MISSION_ID: missionId,
        MISSION_IMAGE_FILE_NAME: imageFileName
    } = req.body;

    if(!missionId) {
        res.status(400).json(badRequestErrorResponse);
        return;
    }

    try {
        await missionRepository.deleteMission(missionId, missionTest);
        const serverResponse: ServerResponse = { message: 'Mission has been deleted successfully' };
        res.status(200).json(serverResponse);

        if (imageFileName) {
            await imageRepository.deleteImage(getImagePath(imageFileName))
                .catch(error => e(new Error(`Error deleting mission image ${imageFileName} : ${error.message}`)));
        }
    } catch (error: any) {
        e(new Error(`Error deleting mission ${missionId} : ${error.message}`));
        res.status(500).json(oracleErrorResponse(error));
        return;
    }
}

export const reportMission = async (req: Request, res: Response): Promise<void> => {
    const {
        missionId: missionId,
        reporter: reporter,
        reason: reason
    } = req.body;

    if(!missionId || !reporter || !reason) {
        res.status(400).json(badRequestErrorResponse);
        return;
    }

    const report: MissionReport = {
        missionId: missionId,
        reporter: reporter,
        reason: reason
    };

    try {
        await missionRepository.reportMission(report);
        const serverResponse: ServerResponse = { message: 'Mission has been reported successfully' };
        res.status(200).json(serverResponse);
    } catch (error: any) {
        e(new Error(`Error reporting mission ${missionId}: ${error.message}`));
        res.status(500).json(internalServerErrorResponse);
    }
}

export const addParticipant = async (req: Request, res: Response): Promise<void> => {
    const {
        MISSION_ID: missionId,
        USER_ID: userId
    } = req.body;

    if(!missionId || !userId) {
        res.status(400).json(badRequestErrorResponse);
        return;
    }

    try {
        await missionRepository.addMissionParticipant(missionId, userId);
        const serverResponse: ServerResponse = { message: 'Participant has been added to mission successfully' };
        res.status(200).json(serverResponse);
    } catch (error: any) {
        e(new Error(`Error adding mission participant ${userId} to mission ${missionId}: ${error.message}`));
        res.status(500).json(oracleErrorResponse);
    }
}

export const removeParticipant = async (req: Request, res: Response): Promise<void> => {
    const {
        MISSION_ID: missionId,
        USER_ID: userId
    } = req.body;

    if(!missionId || !userId) {
        res.status(400).json(badRequestErrorResponse);
        return;
    }

    try {
        await missionRepository.deleteMissionParticipant(missionId, userId);
        const serverResponse: ServerResponse = { message: 'Participant has been removed from mission successfully' };
        res.status(200).json(serverResponse);
    } catch (error: any) {
        e(new Error(`Error removing mission participant ${userId} to mission ${missionId}: ${error.message}`));
        res.status(500).json(oracleErrorResponse(error));
    }
}

function getImagePath(fileName: string): string {
    return `MissionImages/${fileName}`;
}