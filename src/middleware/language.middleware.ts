import { Request, Response, NextFunction } from "express";
import i18next, { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, SupportedLanguage } from "../i18n";

export const languageMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const acceptLanguage = req.headers["accept-language"];

  let detectedLang: SupportedLanguage = DEFAULT_LANGUAGE;

  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(",")
      .map((lang) => {
        const parts = lang.trim().split(";q=");
        const code = parts[0];
        const priority = parts[1];
        return {
          code: code?.split("-")[0]?.toLowerCase() ?? "",
          priority: priority ? parseFloat(priority) : 1,
        };
      })
      .filter((lang) => lang.code !== "")
      .sort((a, b) => b.priority - a.priority);

    for (const lang of languages) {
      if (SUPPORTED_LANGUAGES.includes(lang.code as SupportedLanguage)) {
        detectedLang = lang.code as SupportedLanguage;
        break;
      }
    }
  }

  req.language = detectedLang;
  req.t = i18next.getFixedT(detectedLang);

  next();
};
