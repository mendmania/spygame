import { generateRoomId } from "./generateRoomId";

export const generateUsername = () => {
    return `Name-${generateRoomId()}`;
}
