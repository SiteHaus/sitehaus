"use client";

import Image from "next/image";
import { Button } from "@site-haus/ui/components/base/button";
import { Smartphone, Code2, Database, Cloud, Zap } from "lucide-react";
export default function App() {
  const technologies = [
    { icon: Code2, name: "Development" },
    { icon: Smartphone, name: "Mobile" },
    { icon: Database, name: "Backend" },
    { icon: Cloud, name: "Cloud" },
    { icon: Zap, name: "Performance" },
  ];
  return (
    <>
      <main className="py-12">
        <section className="text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="md:w-1/2 space-y-6">
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              Professional <span className="text-primary">consulting</span> for
              your app & software
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl">
              Hey there! We're SiteHaus. A coding consultancy focused on coding
              and deployment solutions.
            </p>
            <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 mt-4">
              <Button className="px-8 py-4 text-lg">Let's talk</Button>
              <Button variant="outline" className="px-8 py-4 text-lg">
                See case studies
              </Button>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center mt-8 md:mt-0">
            <Image
              src="/sitehausLight.png"
              width={700}
              height={700}
              className="rounded-lg"
              alt="John Parker"
            />
          </div>
        </section>
        <section>
          <div className="w-full mt-15">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-black-500 text-lg mb-6">
                Join just like the best companies out there
              </p>
              <div className="flex items-center justify-between gap-12 flex-wrap border-t border-b border-gray-200 py-8">
                {technologies.map((tech, index) => (
                  <tech.icon
                    key={index}
                    size={40}
                    className="text-muted-foreground opacity-50 hover:opacity-100 transition-opacity"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
