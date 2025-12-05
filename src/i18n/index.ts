import i18next, { TFunction } from "i18next";

import esCommon from "./locales/es/common.json";
import esValidation from "./locales/es/validation.json";
import esEmail from "./locales/es/email.json";

import enCommon from "./locales/en/common.json";
import enValidation from "./locales/en/validation.json";
import enEmail from "./locales/en/email.json";

export const SUPPORTED_LANGUAGES = ["es", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = "es";

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
    namespace Express {
        interface Request {
            language: SupportedLanguage;
            t: TFunction;
        }
    }
}

i18next.init({
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    ns: ["common", "validation", "email"],
    defaultNS: "common",
    resources: {
        es: {
            common: esCommon,
            validation: esValidation,
            email: esEmail,
        },
        en: {
            common: enCommon,
            validation: enValidation,
            email: enEmail,
        },
    },
    interpolation: {
        escapeValue: false,
    },
});

export default i18next;

export const getTranslator = (lang: SupportedLanguage) => {
    return i18next.getFixedT(lang);
};
