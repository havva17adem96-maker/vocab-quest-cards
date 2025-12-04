import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package, ChevronDown, Check } from "lucide-react";

interface PackageSelectorProps {
  packages: string[];
  selectedPackage: string | null;
  onSelectPackage: (pkg: string | null) => void;
}

export function PackageSelector({
  packages,
  selectedPackage,
  onSelectPackage,
}: PackageSelectorProps) {
  const displayName = selectedPackage || "Tüm Kelimeler";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Package className="w-4 h-4" />
          {displayName}
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 bg-background border border-border z-50">
        <DropdownMenuItem
          onClick={() => onSelectPackage(null)}
          className="gap-2 cursor-pointer"
        >
          {selectedPackage === null && <Check className="w-4 h-4" />}
          {selectedPackage !== null && <span className="w-4" />}
          Tüm Kelimeler
        </DropdownMenuItem>
        {packages.map((pkg) => (
          <DropdownMenuItem
            key={pkg}
            onClick={() => onSelectPackage(pkg)}
            className="gap-2 cursor-pointer"
          >
            {selectedPackage === pkg && <Check className="w-4 h-4" />}
            {selectedPackage !== pkg && <span className="w-4" />}
            {pkg}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
