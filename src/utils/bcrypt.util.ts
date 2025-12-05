import bcrypt from "bcryptjs";

export const hashPassword = async (password: string) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

export const expiresIn = (minutes: number = 15) => new Date(Date.now() + minutes * 60 * 1000);
