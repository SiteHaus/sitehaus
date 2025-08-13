import { Button } from "@site-haus/ui/components/base/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@site-haus/ui/components/base/command";
import {
  FormControl,
  FormItem,
  FormLabel,
} from "@site-haus/ui/components/base/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@site-haus/ui/components/base/popover";
import { cn } from "@site-haus/ui/lib/utils";
import { Check } from "lucide-react";
import {
  ControllerRenderProps,
  FieldValues,
  Path,
  UseFormReturn,
} from "react-hook-form";

type Option = {
  label: string;
  value: string;
};

type ComboBoxFieldProps<T extends FieldValues> = {
  field: ControllerRenderProps<T, Path<T>>;
  name: Path<T>;
  label: string;
  options: Option[];
  form: UseFormReturn<T>;
  fullWidth?: boolean;
};

export const ComboBoxField = <T extends FieldValues>({
  field,
  name,
  label,
  options,
  form,
  fullWidth = true,
}: ComboBoxFieldProps<T>) => {
  return (
    <FormItem className={cn(fullWidth && "flex-1")}>
      <FormLabel>{label}</FormLabel>
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "w-full justify-between",
                !field.value && "text-muted-foreground"
              )}
            >
              {field.value
                ? options.find((opt: any) => opt.value === field.value)?.label
                : `Select ${label.toLowerCase()}`}
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No results found...</CommandEmpty>
              <CommandGroup>
                {options.map((option: any) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => form.setValue(name, option.value)}
                  >
                    {option.label}
                    <Check
                      className={cn(
                        "ml-auto",
                        option.value === field.value
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FormItem>
  );
};
