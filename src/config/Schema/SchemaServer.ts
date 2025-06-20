import { defineSchema } from "../../Validation/defineSchema";
import { IConfigValidationOptionalFields } from "../interface/IConfigValidationOptionalFields";
import { IConfigServer } from "../interface/IConfigServer";

export default defineSchema<IConfigValidationOptionalFields, {},IConfigServer>({
    host: {
        type: "String",
        required: true,
        defaultValue: "0.0.0.0"
    },
    port: {
        type: "Number"
    },
    publicKey: {
        type: "String",
        length: 16
    },
    "staticPath": {
        type: "String",
        defaultValue: "./static"
    },
    "tempPath": {
        type: "String",
        defaultValue: "./temp"
    },
    "uploadPath": {
        type: "String",
        defaultValue: "./upload"
    },
    "staticRoute": {
        type: "String",
        defaultValue: "/static"
    },
    "sessionExpired": {
        type: "Number",
        defaultValue: 300
    }
});
