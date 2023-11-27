
# I18nScriptList

---

this mod export addon:

`I18nScriptList` : `I18nScriptListAddon`



```json lines

{
  "scriptFileList": [
    // this still will work
    // 这里的脚本仍然会被插入SC2 data并执行
  ],
  "addonPlugin": [
    {
      "modName": "I18nScriptList",
      "addonName": "I18nScriptListAddon",
      "modVersion": "^1.0.0",
      "params": {
        // 主语言（备用语言），当当前语言找不到对应项文件时，使用此语言作为备用
        "mainLanguage": "zh-CN",
        "languageFile": [
          {
            "language": "zh-CN",
            "scriptFileList": [
              "zh/MyMod_script1.js",
              "zh/MyMod_script2.js",
            ]
          },
          {
            "language": "en-US",
            "scriptFileList": [
              "en/MyMod_script1.js",
              "en/MyMod_script2.js",
            ]
          },
        ],
      }
    }
  ],
  "dependenceInfo": [
    {
      "modName": "I18nScriptList",
      "version": "^1.0.0"
    }
  ]
}

```
