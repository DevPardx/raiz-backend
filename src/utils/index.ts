export const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

export const tokenExpiresIn = (minutes: number = 15) => new Date(Date.now() + minutes * 60 * 1000);

export const refreshTokenExpiresIn = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
