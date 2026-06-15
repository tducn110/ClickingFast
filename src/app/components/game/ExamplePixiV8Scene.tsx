import { useEffect, useRef } from "react";
import { Application, Assets, Sprite } from "pixi.js";

// Vite asset import
import heroImage from "../../../../public/magnific__upload__50109.png";

export function ExamplePixiV8Scene() {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // We declare app outside the async function so we can clean it up later
    const app = new Application();
    let sprite: Sprite | null = null;

    const initPixi = async () => {
      // Initialize the application (PixiJS v8 uses app.init instead of new Application({ ... }))
      await app.init({ 
        width: 800, 
        height: 600, 
        backgroundColor: 0xdcecf0, // Using the Surface / Muted color from Pastel Serenity
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      // Append the canvas to the DOM
      if (canvasRef.current) {
        canvasRef.current.appendChild(app.canvas);
      }

      // 1. Load the asset using PixiJS v8 Assets API with imported local image
      const texture = await Assets.load(heroImage);

      // 2. Create the Sprite
      sprite = Sprite.from(texture);

      // Center the sprite's anchor point
      sprite.anchor.set(0.5);

      // Move the sprite to the center of the screen
      sprite.x = app.screen.width / 2;
      sprite.y = app.screen.height / 2;

      // Scale it down since it's a large image
      sprite.scale.set(0.25);

      app.stage.addChild(sprite);

      // 3. Ticker-driven animation (PixiJS v8 uses ticker.deltaTime)
      app.ticker.add((ticker) => {
        if (sprite) {
          // Rotate the sprite, using deltaTime for frame-independent movement
          sprite.rotation += 0.05 * ticker.deltaTime;
        }
      });
    };

    initPixi();

    // Cleanup function
    return () => {
      // Clean up the application and its children when the component unmounts
      app.destroy(true, { children: true });
    };
  }, []);

  return (
    <div className="flex justify-center items-center w-full h-full p-4 bg-background">
      <div 
        ref={canvasRef} 
        className="rounded-2xl overflow-hidden shadow-[0_10px_40px_-10px_rgba(74,77,78,0.08)] border border-border" 
      />
    </div>
  );
}
