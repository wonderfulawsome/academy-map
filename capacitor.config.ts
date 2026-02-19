import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: "com.academymap.app",
  appName: "학원명당",
  webDir: "build",
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,  
      launchAutoHide: false,    
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      showSpinner: false
    }
  }
};

export default config;