import { useEffect, useRef } from "react";

export default function Game() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Focus the iframe when component mounts
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      <iframe
        ref={iframeRef}
        src="/game2.html"
        className="w-full h-full border-0"
        title="Modularity Engine Game"
        allow="autoplay; fullscreen"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
