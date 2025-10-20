"use client";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@site-haus/ui/components/base/navigation-menu";
import Link from "next/link";
import { CreateContactForm } from "@site-haus/ui/components/forms/contact-form";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@site-haus/ui/components/base/carousel";
import { Separator } from "@site-haus/ui/components/base/separator";
import {
  Card,
  CardContent,
  CardTitle,
} from "@site-haus/ui/components/base/card";

export default function App() {
  const quotes = [
    {
      name: "Jane Doe",
      company: "One Health Clinics",
      quote: "Working with SiteHaus transformed our digital presence!",
    },
    {
      name: "John Smith",
      company: "Camo",
      quote: "Their team is professional, creative, and reliable.",
    },
    {
      name: "Emily Johnson",
      company: "TechCorp",
      quote: "Our website redesign exceeded all expectations.",
    },
  ];

  return (
    <main>
      {/* NAVBAR SECTION */}
      <section id="contact" className="px-10 lg:px-40 pt-20 flex flex-col">
        {/* Top Row: Navbar */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-1">
            <img
              src="/sitehausLight.png"
              alt="SiteHaus logo"
              className="h-10 w-auto"
            />
            <h1 className="font-bold text-3xl">SiteHaus</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <NavigationMenu>
              <NavigationMenuList className="flex gap-8">
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/">Home</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="#services">Services</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="#projects">Projects</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="#testimonials">Testimonials</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </nav>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row items-center justify-between bg-background rounded-xl px-6 sm:px-10 lg:gap-16 py-12">
          {/* LEFT: Text content */}
          <div className="w-full lg:w-3/5 text-center lg:text-left mb-8 lg:mb-0">
            <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6">
              A professional team of designers and developers
            </h2>
          </div>

          {/* RIGHT: Contact Form */}
          <div className="w-full lg:w-2/5 p-8">
            <CreateContactForm />
          </div>
        </div>
      </section>

      <section id="services" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-40 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
            What We Do
          </h2>
          <p className="text-muted-foreground mb-12">
            We provide a range of services to help your business grow. Here’s
            how we can help:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Service 1 */}
            <Card className="bg-background border border-border shadow-md rounded-2xl p-6 hover:shadow-xl transition">
              <CardTitle className="text-xl font-semibold text-primary mb-2">
                Design
              </CardTitle>
              <CardContent className="text-foreground">
                Creating beautiful and user-friendly designs that reflect your
                brand.
              </CardContent>
            </Card>

            {/* Service 2 */}
            <Card className="bg-background border border-border shadow-md rounded-2xl p-6 hover:shadow-xl transition">
              <CardTitle className="text-xl font-semibold text-primary mb-2">
                Development
              </CardTitle>
              <CardContent className="text-foreground">
                Building fast, responsive, and scalable websites and
                applications.
              </CardContent>
            </Card>

            {/* Service 3 */}
            <Card className="bg-background border border-border shadow-md rounded-2xl p-6 hover:shadow-xl transition">
              <CardTitle className="text-xl font-semibold text-primary mb-2">
                Consulting
              </CardTitle>
              <CardContent className="text-foreground">
                Helping you plan and execute digital strategies for growth.
              </CardContent>
            </Card>

            {/* Service 4 */}
            <Card className="bg-background border border-border shadow-md rounded-2xl p-6 hover:shadow-xl transition">
              <CardTitle className="text-xl font-semibold text-primary mb-2">
                Branding
              </CardTitle>
              <CardContent className="text-foreground">
                Crafting memorable brand identities and marketing assets.
              </CardContent>
            </Card>

            {/* Service 5 */}
            <Card className="bg-background border border-border shadow-md rounded-2xl p-6 hover:shadow-xl transition">
              <CardTitle className="text-xl font-semibold text-primary mb-2">
                SEO Optimization
              </CardTitle>
              <CardContent className="text-foreground">
                Improving your website’s visibility on search engines to attract
                more traffic.
              </CardContent>
            </Card>

            {/* Service 6 */}
            <Card className="bg-background border border-border shadow-md rounded-2xl p-6 hover:shadow-xl transition">
              <CardTitle className="text-xl font-semibold text-primary mb-2">
                Social Media
              </CardTitle>
              <CardContent className="text-foreground">
                Managing your social channels and campaigns to engage your
                audience effectively.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="projects" className="py-20 bg-background">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Project 1 */}
          <Card className="bg-background rounded-xl shadow-md hover:shadow-lg transition-transform hover:scale-105 overflow-hidden">
            <CardContent className="p-0">
              <img
                src="/performance.jpg"
                alt="Project 1"
                className="w-full h-48 object-cover"
              />
              <div className="p-4 -mt-6 bg-background/80 backdrop-blur-sm">
                <CardTitle className="text-lg font-semibold text-primary mb-1">
                  One Health Clinics
                </CardTitle>
                <p className="text-foreground text-sm">
                  A modern website built for a local health clinic
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Project 2 */}
          <Card className="bg-background rounded-xl shadow-md hover:shadow-lg transition-transform hover:scale-105 overflow-hidden">
            <CardContent className="p-0">
              <img
                src="/development.jpg"
                alt="Project 2"
                className="w-full h-48 object-cover"
              />
              <div className="p-4 -mt-6 bg-background/80 backdrop-blur-sm">
                <CardTitle className="text-lg font-semibold text-primary mb-1">
                  Camo
                </CardTitle>
                <p className="text-foreground text-sm">
                  Branding and website redesign for a modern business
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Project 3 */}
          <Card className="bg-background rounded-xl shadow-md hover:shadow-lg transition-transform hover:scale-105 overflow-hidden">
            <CardContent className="p-0">
              <img
                src="/backend.jpg"
                alt="Project 3"
                className="w-full h-48 object-cover"
              />
              <div className="p-4 -mt-6 bg-background/80 backdrop-blur-sm">
                <CardTitle className="text-lg font-semibold text-primary mb-1">
                  TechCorp
                </CardTitle>
                <p className="text-foreground text-sm">
                  Custom web app with responsive design and seamless UX
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="testimonials" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6 lg:px-40 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
            What Our Clients Say
          </h2>
          <p className="text-muted-foreground mb-12">
            Hear from some of the amazing clients we’ve worked with.
          </p>

          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="gap-6">
              {quotes.map((testimonial, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-4">
                    <Card className="bg-background border border-border shadow-md hover:shadow-xl transition rounded-2xl p-6 text-left">
                      <CardContent>
                        <p className="text-foreground italic text-lg mb-4">
                          &quot;{testimonial.quote}&quot;
                        </p>
                        <p className="font-semibold text-primary">
                          {testimonial.name}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {testimonial.company}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselPrevious className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-primary/80 hover:bg-primary shadow-lg p-2 rounded-full text-white z-10 transition">
              &larr;
            </CarouselPrevious>
            <CarouselNext className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-primary/80 hover:bg-primary shadow-lg p-2 rounded-full text-white z-10 transition">
              &rarr;
            </CarouselNext>
          </Carousel>
        </div>
      </section>
      <section className="py-20 bg-primary rounded-xl mx-6 lg:mx-40 my-20 text-center">
        <h2 className="text-4xl md:text-5xl font-extrabold text-background mb-4">
          Ready to Start Your Project?
        </h2>
        <p className="text-muted-foreground mb-8 text-lg md:text-xl">
          Let’s work together to build something amazing. Reach out and schedule
          a consultation today!
        </p>
        <a
          href="#contact"
          className="inline-block bg-background text-primary font-semibold px-8 py-4 rounded-xl shadow-md hover:shadow-lg hover:bg-background/90 transition"
        >
          Get in Touch
        </a>
      </section>
    </main>
  );
}
