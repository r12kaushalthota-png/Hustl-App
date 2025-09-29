import { ConfigPlugin, withDangerousMod } from "@expo/config-plugins";
import fs from "fs";
import path from "path";

const withLocalSearch: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;

      const filesToCopy = ["LocalSearchModule.swift", "LocalSearchModule.m"];

      const iosTargetPath = path.join(projectRoot, "ios");

      filesToCopy.forEach((file) => {
        const srcPath = path.join(projectRoot, "native-modules", file);
        const destPath = path.join(iosTargetPath, file);

        if (!fs.existsSync(srcPath)) {
          console.warn(`⚠️  File not found: ${srcPath}`);
        } else {
          fs.copyFileSync(srcPath, destPath);
          console.log(`✅ Copied ${file} into ${iosTargetPath}`);
        }
      });

      return config;
    },
  ]);
};

export default withLocalSearch;
