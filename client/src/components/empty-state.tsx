
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LayoutList, Gift, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  actionLink?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  actionLink,
  onAction,
}: EmptyStateProps) {
  const FadeIn = ({ children, delay = 0 }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          transition: { 
            duration: 0.4, 
            delay: delay 
          } 
        }}
      >
        {children}
      </motion.div>
    );
  };

  return (
    <div className="text-center p-8 rounded-lg border border-dashed flex flex-col items-center justify-center space-y-4 bg-muted/30">
      <FadeIn>
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
          {icon || <LayoutList className="h-6 w-6" />}
        </div>
      </FadeIn>
      
      <FadeIn delay={0.1}>
        <h3 className="text-lg font-medium">{title}</h3>
      </FadeIn>
      
      <FadeIn delay={0.2}>
        <p className="text-muted-foreground max-w-md mx-auto">
          {description}
        </p>
      </FadeIn>
      
      {(actionLabel && (actionLink || onAction)) && (
        <FadeIn delay={0.3}>
          {actionLink ? (
            <Link href={actionLink}>
              <Button className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                {actionLabel}
              </Button>
            </Link>
          ) : (
            <Button className="mt-2" onClick={onAction}>
              <Plus className="mr-2 h-4 w-4" />
              {actionLabel}
            </Button>
          )}
        </FadeIn>
      )}
    </div>
  );
}
