import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SiteLogoProps = {
  withText?: boolean;
  imageSize?: number;
  textSizeClassName?: string;
  href?: string;
  className?: string;
};

export function SiteLogo({
  withText = true,
  imageSize = 40,
  textSizeClassName = "text-base",
  href = "/",
  className,
}: SiteLogoProps) {
  return (
    <Link href={href} className={cn("flex items-center gap-3", className)}>
      <Image
        src="/proboost-logo.png"
        alt="ProBoost.gg logo"
        width={imageSize}
        height={imageSize}
        className="rounded-full object-cover shadow-[0_0_28px_-10px_rgba(77,184,255,0.9)]"
        priority
      />
      {withText ? (
        <span className={cn("font-semibold tracking-tight text-white", textSizeClassName)}>
          ProBoost<span className="text-gradient">.gg</span>
        </span>
      ) : null}
    </Link>
  );
}
