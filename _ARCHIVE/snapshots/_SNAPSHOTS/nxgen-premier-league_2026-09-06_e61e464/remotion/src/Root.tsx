import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={630} // 21s seamless loop @ 30fps — 7 scenes x 3s
    fps={30}
    width={1920}
    height={1080}
  />
);
