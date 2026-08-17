/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 天地图（国家地理信息公共服务平台）服务 token，部署时通过环境变量注入 */
  readonly VITE_TIANDITU_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
