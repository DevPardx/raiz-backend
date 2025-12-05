import { TFunction } from "i18next";
import { RegisterUserEmail } from "../types/auth";

export class EmailTemplates {
  static verifyAccountTemplate = async (data: RegisterUserEmail, t: TFunction) => {
    return `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html dir="ltr" lang="${t("lng")}">
            <head>
                <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
                <meta name="x-apple-disable-message-reformatting" />
                <!--$-->
            </head>
            <body style="background-color:rgb(255,255,255)">
                <table
                border="0"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                align="center">
                <tbody>
                    <tr>
                    <td
                        style='background-color:rgb(255,255,255);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Roboto","Oxygen","Ubuntu","Cantarell","Fira Sans","Droid Sans","Helvetica Neue",sans-serif;color:rgb(33,33,33)'>
                        <div
                        style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0"
                        data-skip-in-text="true">
                        ${t("verify_account_preview", { ns: "email" })}
                        <div>

                        </div>
                        </div>
                        <table
                        align="center"
                        width="100%"
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                        style="max-width:37.5em;padding:20px;margin-right:auto;margin-left:auto;background-color:rgb(238,238,238)">
                        <tbody>
                            <tr style="width:100%">
                            <td>
                                <table
                                align="center"
                                width="100%"
                                border="0"
                                cellpadding="0"
                                cellspacing="0"
                                role="presentation"
                                style="background-color:rgb(255,255,255)">
                                <tbody>
                                    <tr>
                                    <td>
                                        <table
                                        align="center"
                                        width="100%"
                                        border="0"
                                        cellpadding="0"
                                        cellspacing="0"
                                        role="presentation"
                                        style="background-color:rgb(37,47,61);display:flex;padding-bottom:20px;padding-top:20px;align-items:center;justify-content:center">
                                        <tbody>
                                            <tr>
                                            <td>
                                                <img
                                                alt="Raíz Logo"
                                                height="45"
                                                src="https://res.cloudinary.com/dlgry4fcv/image/upload/v1764892003/rai%CC%81z-logo_tlv9hx.svg"
                                                style="display:block;outline:none;border:none;text-decoration:none"
                                                width="75" />
                                            </td>
                                            </tr>
                                        </tbody>
                                        </table>
                                        <table
                                        align="center"
                                        width="100%"
                                        border="0"
                                        cellpadding="0"
                                        cellspacing="0"
                                        role="presentation"
                                        style="padding-bottom:25px;padding-top:25px;padding-right:35px;padding-left:35px">
                                        <tbody>
                                            <tr>
                                            <td>
                                                <h1
                                                style="color:rgb(51,51,51);font-size:20px;font-weight:700;margin-bottom:15px">
                                                ${t("verify_account_title", { ns: "email" })}
                                                </h1>
                                                <p
                                                style="font-size:14px;line-height:24px;color:rgb(51,51,51);margin-top:24px;margin-bottom:14px;margin-right:0;margin-left:0">
                                                ${t("verify_account_body", { ns: "email" })}
                                                </p>
                                                <table
                                                align="center"
                                                width="100%"
                                                border="0"
                                                cellpadding="0"
                                                cellspacing="0"
                                                role="presentation"
                                                style="display:flex;align-items:center;justify-content:center">
                                                <tbody>
                                                    <tr>
                                                    <td>
                                                        <p
                                                        style="font-size:14px;line-height:24px;color:rgb(51,51,51);margin:0;font-weight:700;text-align:center;margin-top:0;margin-bottom:0;margin-left:0;margin-right:0">
                                                        ${t("verify_account_verification_code_label", { ns: "email" })}
                                                        </p>
                                                        <p
                                                        style="font-size:36px;line-height:24px;color:rgb(51,51,51);margin-bottom:10px;margin-top:10px;margin-right:0;margin-left:0;font-weight:700;text-align:center">
                                                            ${data.token}
                                                        </p>
                                                        <p
                                                        style="font-size:14px;line-height:24px;color:rgb(51,51,51);margin:0;text-align:center;margin-top:0;margin-bottom:0;margin-left:0;margin-right:0">
                                                            ${t("verify_account_code_validity", { ns: "email" })}
                                                        </p>
                                                    </td>
                                                    </tr>
                                                </tbody>
                                                </table>
                                            </td>
                                            </tr>
                                        </tbody>
                                        </table>
                                        <hr
                                        style="width:100%;border:none;border-top:1px solid #eaeaea" />
                                        <table
                                        align="center"
                                        width="100%"
                                        border="0"
                                        cellpadding="0"
                                        cellspacing="0"
                                        role="presentation"
                                        style="padding-bottom:25px;padding-top:25px;padding-right:35px;padding-left:35px">
                                        <tbody>
                                            <tr>
                                            <td>
                                                <p
                                                style="font-size:14px;line-height:24px;color:rgb(51,51,51);margin:0;margin-top:0;margin-bottom:0;margin-left:0;margin-right:0">
                                                ${t("verify_account_security_note", { ns: "email" })}
                                                </p>
                                            </td>
                                            </tr>
                                        </tbody>
                                        </table>
                                    </td>
                                    </tr>
                                </tbody>
                                </table>
                            </td>
                            </tr>
                        </tbody>
                        </table>
                    </td>
                    </tr>
                </tbody>
                </table>
                <!--/$-->
            </body>
            </html>
        `;
  };
}
