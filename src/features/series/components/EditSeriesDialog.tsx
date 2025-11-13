import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Series } from "@/types/story";
import { SeriesForm } from "./SeriesForm";

interface EditSeriesDialogProps {
    series: Series | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const EditSeriesDialog = ({ series, open, onOpenChange }: EditSeriesDialogProps) => {
    if (!series) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Series</DialogTitle>
                    <DialogDescription>Update the series name and description.</DialogDescription>
                </DialogHeader>
                <SeriesForm series={series} onSuccess={() => onOpenChange(false)} />
            </DialogContent>
        </Dialog>
    );
};
