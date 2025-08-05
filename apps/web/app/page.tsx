"use client";

import { useTheme } from "./context/ThemeContext";
import { Button } from "@site-haus/ui/components/base/button";
import Image, { type ImageProps } from "next/image";

type Props = Omit<ImageProps, "src"> & {
  srcLight: string;
  srcDark: string;
};

const ThemeImage = (props: Props) => {
  const { srcLight, srcDark, ...rest } = props;
  const { theme } = useTheme();

  return (
    <Image
      {...rest}
      src={theme === "light" ? srcLight : srcDark}
      alt={rest.alt}
    />
  );
};

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center ${
        theme === "light" ? "bg-white text-black" : "bg-zinc-900 text-white"
      }`}
    >
      <ThemeImage
        srcLight="/sitehausLight.png"
        srcDark="/sitehausDark.png"
        alt="SiteHaus logo"
        width={180}
        height={38}
        priority
      />

      <Button
        onClick={toggleTheme}
        className={`mb-8 px-4 py-2 rounded ${theme === "light" ? "text-white" : "text-black bg-white"}`}
      >
        Switch to {theme === "light" ? "Dark" : "Light"} Mode
      </Button>

      <div>
        <p>Welcome to the themed site!</p>
      </div>
    </div>
  );
}
