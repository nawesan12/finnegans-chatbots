"use client";
import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterOption = {
  value: string;
  label: string;
  description?: string;
};

type FilterMultiSelectProps = {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onSelectionChange: (nextValues: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

const FilterMultiSelect: React.FC<FilterMultiSelectProps> = ({
  label,
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Todos",
  className,
  disabled,
}) => {
  const summaryLabel = useMemo(() => {
    if (!selectedValues.length) {
      return placeholder;
    }

    if (selectedValues.length === 1) {
      const selectedOption = options.find(
        (option) => option.value === selectedValues[0],
      );
      return selectedOption?.label ?? placeholder;
    }

    return `${selectedValues.length} seleccionados`;
  }, [options, placeholder, selectedValues]);

  const handleToggle = (value: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedValues, value]);
      return;
    }

    onSelectionChange(selectedValues.filter((item) => item !== value));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-between gap-2 text-sm font-medium", 
            disabled && "opacity-60 cursor-not-allowed", 
            className,
          )}
          disabled={disabled}
        >
          <span className="text-muted-foreground">{label}:</span>
          <span className="truncate max-w-[140px] text-left">{summaryLabel}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onSelectionChange([]);
          }}
          className={cn(
            "text-sm", 
            !selectedValues.length && "font-semibold text-primary",
          )}
        >
          Todos
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {options.length ? (
          options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedValues.includes(option.value)}
              onCheckedChange={(checked) => handleToggle(option.value, checked)}
              className="text-sm"
            >
              <div className="flex flex-col gap-1">
                <span>{option.label}</span>
                {option.description ? (
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                ) : null}
              </div>
            </DropdownMenuCheckboxItem>
          ))
        ) : (
          <div className="px-2 py-4 text-sm text-muted-foreground">
            No hay opciones disponibles
          </div>
        )}
        {selectedValues.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onSelectionChange([]);
              }}
              className="text-sm text-muted-foreground"
            >
              Limpiar selección
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FilterMultiSelect;
