import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  configureRevenueCat,
  fetchTipProducts,
  purchaseTip,
  TIP_TIERS,
  type TipTier,
} from "@/lib/revenuecat";
import { trackTip } from "@/lib/analytics";

const PARTICLES = Array.from({ length: 12 }, (_, i) => i);
const PARTICLE_SYMBOLS = ["✨", "💜", "⭐"] as const;

function ThankYouOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {PARTICLES.map((i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute text-2xl"
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0.5],
            x: Math.cos((i / 12) * Math.PI * 2) * (80 + (i % 3) * 25),
            y: Math.sin((i / 12) * Math.PI * 2) * (80 + (i % 3) * 25),
          }}
          transition={{ duration: 1.8, delay: i * 0.05, ease: "easeOut" }}
        >
          {PARTICLE_SYMBOLS[i % 3]}
        </motion.span>
      ))}

      <motion.div
        className="flex flex-col items-center gap-4 text-center"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
      >
        <motion.span
          className="text-6xl"
          animate={{ scale: [1, 1.3, 1, 1.15, 1] }}
          transition={{ duration: 1.0, delay: 0.3 }}
        >
          💜
        </motion.span>
        <p className="text-2xl font-bold tracking-tight">Thank you!</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Your tip means the world and keeps PocketSets alive. Enjoy the show!
        </p>
      </motion.div>
    </motion.div>
  );
}

export function TipJar() {
  const { toast } = useToast();
  const [products, setProducts] = useState<TipTier[]>(TIP_TIERS);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    configureRevenueCat()
      .then(() => fetchTipProducts())
      .then(setProducts)
      .catch(() => {});
  }, []);

  const handlePurchase = async (tier: TipTier) => {
    if (purchasing) return;
    setPurchasing(tier.productId);
    try {
      const result = await purchaseTip(tier.productId);
      if (result.success) {
        trackTip(tier.amountUsd);
        setShowThankYou(true);
      }
    } catch {
      toast({
        title: "Purchase failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const storeName =
    Capacitor.getPlatform() === "android" ? "Google Play" : "App Store";

  return (
    <>
      <AnimatePresence>
        {showThankYou && <ThankYouOverlay onDone={() => setShowThankYou(false)} />}
      </AnimatePresence>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-purple-500" />
            Leave a Tip
          </CardTitle>
          <CardDescription>
            PocketSets is free and ad-free. A tip helps keep it that way — thank you!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {products.map((tier) => (
              <Button
                key={tier.productId}
                variant="outline"
                className="h-auto flex-col gap-1 py-3 hover:border-purple-500 hover:text-purple-500"
                disabled={!!purchasing}
                onClick={() => handlePurchase(tier)}
              >
                {purchasing === tier.productId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="font-semibold">{tier.label}</span>
                )}
              </Button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Tips are processed securely through the {storeName}. No account required.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
