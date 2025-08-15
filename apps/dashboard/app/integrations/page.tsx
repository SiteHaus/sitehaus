import {
  Card,
  CardHeader,
  CardFooter,
  CardContent,
} from "@site-haus/ui/components/base/card";
import { Button } from "@site-haus/ui/components/base/button";
import Image from "next/image";
import { MoveUpRight } from "lucide-react";

const IntegrationsRoute = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold">Integrations</h1>
      <p className="font-light tracking-wide pb-4">
        View all open integrations for Site Haus.
      </p>

      <div className="grid grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex justify-center">
            <Image
              src="/github-mark.svg"
              alt="Github Mark"
              width={120}
              height={120}
            />
          </CardHeader>
          <CardContent className="flex justify-center text-lg">
            Github
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button>
              Connect <MoveUpRight />
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex justify-center">
            <Image src="/slack.svg" alt="Slack" width={120} height={120} />
          </CardHeader>
          <CardContent className="flex justify-center text-lg">
            Slack
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button>
              Connect <MoveUpRight />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default IntegrationsRoute;
