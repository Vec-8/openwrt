import {definitions} from "zigbee-herdsman-converters/devices/tuya";
import * as tuya from "zigbee-herdsman-converters/lib/tuya";

const upstream = definitions.find((definition) => definition.model === "ZS-300TF");

if (!upstream) {
    throw new Error("Définition Zigbee2MQTT ZS-300TF introuvable");
}

/*
 * La variante _TZE2841000000_hdml1aav envoie le DP 111 sous forme booléenne,
 * alors que la définition amont attend un Tuya Enum(0|1). Accepter les deux
 * représentations conserve la compatibilité avec les deux firmwares connus.
 */
const waterWarningBoolOrEnum = {
    from: (value) => {
        const raw = value?.valueOf?.() ?? value;

        if (raw === false || raw === 0) {
            return "none";
        }

        if (raw === true || raw === 1) {
            return "alarm";
        }

        throw new Error(`Valeur water_warning ZS-300TF non prise en charge: ${String(raw)}`);
    },
    to: (value) => {
        if (value === "none") {
            return tuya.enum(0);
        }

        if (value === "alarm") {
            return tuya.enum(1);
        }

        throw new Error(`Valeur water_warning ZS-300TF invalide: ${String(value)}`);
    },
};

export default {
    ...upstream,
    fingerprint: tuya.fingerprint("TS0601", ["_TZE2841000000_hdml1aav"]),
    description: `${upstream.description} (correctif OTB DP111 booléen)`,
    meta: {
        ...upstream.meta,
        tuyaDatapoints: upstream.meta.tuyaDatapoints.map((entry) => {
            if (entry[0] === 111 && entry[1] === "water_warning") {
                return [entry[0], entry[1], waterWarningBoolOrEnum, ...entry.slice(3)];
            }

            return entry;
        }),
    },
};
