import JSZip from "jszip";
import type {LogWrapper} from "../../../dist-BeforeSC2/ModLoadController";
import type {SC2DataManager} from "../../../dist-BeforeSC2/SC2DataManager";
import type {AddonPluginHookPointEx} from "../../../dist-BeforeSC2/AddonPlugin";
import type {ModUtils} from "../../../dist-BeforeSC2/Utils";
import type {ModBootJsonAddonPlugin, ModInfo} from "../../../dist-BeforeSC2/ModLoader";
import {isArray, isNil, isString, every, isObjectLike} from 'lodash';
import {ModZipReader} from "../../../dist-BeforeSC2/ModZipReader";

export interface LanguageFileItem {
    language: string;
    scriptFileList: string[];
}

export interface I18nScriptListParams {
    mainLanguage: string;
    languageFile: LanguageFileItem[];
}

export interface ModRecord {
    mod: ModInfo;
    modZip: ModZipReader;
    params: I18nScriptListParams;
    state: ModLanguageState;
}

export function checkParams(params: any): params is I18nScriptListParams {
    return params
        && isObjectLike(params)
        && isString(params.mainLanguage)
        && isArray(params.languageFile)
        && every(params.languageFile, (T: LanguageFileItem) =>
            isArray(T.scriptFileList)
            && every(T.scriptFileList, TT => isString(TT))
            && isString(T.language)
        )
        ;
}

function findMaxPrefixItem(s: string, sl: string[]): [string, number] {
    let bestMatch = '';
    let bestMatchIndex = -1;
    sl.forEach((str, index) => {
        if (str.startsWith(s)) {
            if (str.length > bestMatch.length) {
                bestMatch = str;
                bestMatchIndex = index;
            }
            return;
        }
        if (s.startsWith(str)) {
            if (s.length > bestMatch.length) {
                bestMatch = str;
                bestMatchIndex = index;
            }
        }
    });
    return [bestMatch, bestMatchIndex];
}

export class ModLanguageState {
    constructor(
        private logger: LogWrapper,
        private mod: ModInfo,
        private modZip: ModZipReader,
        private params: I18nScriptListParams,
        private _language: string,   // navigator.language
        private _fallbackLanguage: string,
    ) {
        this.modName = this.mod.name;
        this.calcMainLanguage();
    }

    modName: string;

    get language() {
        return this._language;
    }

    get fallbackLanguage() {
        return this._fallbackLanguage;
    }

    _main_language: string | undefined;

    calcMainLanguage() {
        const langList = this.params.languageFile.map(T => T.language);
        if (!this._main_language) {
            if (langList.find(T => T === this._language)) {
                this._main_language = this._language;
            } else {
                const kl = findMaxPrefixItem(this._language, langList);
                if (kl[1] >= 0) {
                    this._main_language = kl[0];
                }
            }
        }
        if (!this._main_language) {
            console.log('[I18nScriptList] calcMainLanguage cannot calc main_language. use fallbackLanguage.', [this.modName, this._fallbackLanguage, langList]);
            this.logger.log(`[I18nScriptList] calcMainLanguage cannot calc main_language. use fallbackLanguage. [${this.modName}] [${this._main_language}] [${JSON.stringify(langList)}]`);
            this._main_language = this._fallbackLanguage;
        }
        console.log('[I18nScriptList] calcMainLanguage result:', [this.modName, this._main_language]);
        this.logger.log(`[I18nScriptList] calcMainLanguage mod[${this.modName}] language[${this._main_language}]`);
    }

    async updateModScriptList() {
        const lfi = this.params.languageFile.find(T => T.language === this.language);
        if (!lfi) {
            console.error('[I18nScriptList] updateModTweeList cannot get languageFile, invalid this.language.', [this.modName, this.params, this.language]);
            this.logger.error(`[I18nScriptList] updateModTweeList cannot get languageFile, invalid this.language. [${this.modName}] [${this.language}]`);
            return;
        }
        this.modZip.refillCacheScriptFileItems(
            lfi.scriptFileList,
            true,
        );
    }
}

export class I18nScriptList implements AddonPluginHookPointEx {
    private readonly logger: LogWrapper;

    constructor(
        public gSC2DataManager: SC2DataManager,
        public gModUtils: ModUtils,
    ) {
        this.logger = gModUtils.getLogger();
    }

    info: ModRecord[] = [];

    async registerMod(addonName: string, mod: ModInfo, modZip: ModZipReader) {
        const ad = mod.bootJson.addonPlugin?.find((T: ModBootJsonAddonPlugin) => {
            return T.modName === 'I18nScriptList'
                && T.addonName === 'I18nScriptListAddon';
        });
        if (isNil(ad)) {
            console.error('[I18nScriptList] cannot find I18nScriptListAddon', [addonName, mod, modZip]);
            this.logger.error(`[I18nScriptList] cannot find I18nScriptListAddon ${addonName} ${mod.name}`);
            return;
        }
        if (!checkParams(ad.params)) {
            console.error('[I18nScriptList] I18nScriptListAddon params invalid', [addonName, mod, modZip]);
            this.logger.error(`[I18nScriptList] I18nScriptListAddon params invalid ${addonName} ${mod.name}`);
            return;
        }
        const params: I18nScriptListParams = ad.params;
        this.info.push({
            mod,
            modZip,
            params,
            state: new ModLanguageState(
                this.logger,
                mod,
                modZip,
                params,
                this.gSC2DataManager.getLanguageManager().getLanguage(),
                params.mainLanguage,
            ),
        });
    }

    async beforePatchModToGame() {
        for (const ri of this.info) {
            await ri.state.updateModScriptList();
        }
    }

    init() {
    }
}
