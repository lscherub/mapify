"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Edit3,
  ExternalLink,
  MapPin,
  Save,
  Search,
  Sparkles,
  Trophy,
  Wifi,
  X
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type VenueCollectionItem, type ExplorerSubmissionStatus } from "@/lib/explorer/types";
import { type Place } from "@/lib/types";

type Props = {
  collection: VenueCollectionItem[];
  allPlaces: Place[];
  submissions: ExplorerSubmissionStatus[];
  onOpenPlaceProfile: (placeId: string) => void;
  onOpenWifiSubmission: (place: Place) => void;
  onUpdateNotes: (placeId: string, notes: string) => void;
  onSwitchToMap: () => void;
};

export function CollectionView({
  collection,
  allPlaces,
  submissions,
  onOpenPlaceProfile,
  onOpenWifiSubmission,
  onUpdateNotes,
  onSwitchToMap
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  // Map submissions by placeId or placeName
  const submissionMap = useMemo(() => {
    const map = new Map<string, ExplorerSubmissionStatus>();
    for (const sub of submissions) {
      if (sub.placeId) {
        map.set(sub.placeId, sub);
      }
      map.set(sub.placeName.toLowerCase(), sub);
    }
    return map;
  }, [submissions]);

  // Derive unique categories from collection
  const categories = useMemo(() => {
    const set = new Set<string>();
    collection.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [collection]);

  // Filter collection by search and category
  const filteredCollection = useMemo(() => {
    return collection.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.placeName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.city && item.city.toLowerCase().includes(q)) ||
        (item.address && item.address.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [collection, selectedCategory, searchQuery]);

  const handleStartEditNotes = (item: VenueCollectionItem) => {
    setEditingNotesId(item.placeId);
    setNotesDraft(item.notes || "");
  };

  const handleSaveNotes = (placeId: string) => {
    onUpdateNotes(placeId, notesDraft.trim());
    setEditingNotesId(null);
    toast.success("Notes saved to your collection entry.");
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <span>My Collection</span>
            <Badge variant="default" className="text-xs font-bold">
              {collection.length}
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your discovered venues, Wi-Fi checkpoints, and journal entries.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSwitchToMap}
          className="rounded-full text-xs gap-1.5 h-8 shrink-0"
        >
          <Compass className="h-3.5 w-3.5 text-blue-500" />
          Radar Map
        </Button>
      </div>

      {/* Search and Category Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collected venues, cities, categories..."
            className="pl-9 h-10 rounded-2xl text-xs bg-muted/40 border-border/60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All ({collection.length})
            </button>
            {categories.map((cat) => {
              const count = collection.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty State */}
      {collection.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 p-8 text-center space-y-3 bg-muted/20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <Compass className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">No venues collected yet</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
              Switch to Radar mode and visit cafes, study spaces, and libraries within 100 meters to log your first discovery!
            </p>
          </div>
          <Button
            type="button"
            onClick={onSwitchToMap}
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 gap-1.5"
          >
            <Compass className="h-3.5 w-3.5" />
            Open Radar Map
          </Button>
        </div>
      ) : filteredCollection.length === 0 ? (
        <div className="rounded-2xl border border-border/50 p-6 text-center text-xs text-muted-foreground">
          No collected venues match your filter.
        </div>
      ) : (
        /* Collection Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[calc(100dvh-280px)] overflow-y-auto pr-1">
          {filteredCollection.map((item) => {
            const place = allPlaces.find((p) => p.id === item.placeId);
            const submission = submissionMap.get(item.placeId) || submissionMap.get(item.placeName.toLowerCase());

            const formattedDate = new Date(item.discoveredAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric"
            });

            const isEditingNotes = editingNotesId === item.placeId;

            return (
              <motion.div
                key={item.placeId}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-2xl border border-border/70 bg-card p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-3 group"
              >
                {/* Top: Name, Category, Date */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="default" className="text-[10px] uppercase font-bold py-0 px-2">
                          {item.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formattedDate}
                        </span>
                      </div>
                      <h4 className="mt-1 text-base font-bold tracking-tight text-foreground truncate">
                        {item.placeName}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate">{item.address || item.city}</p>
                    </div>

                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                      <Trophy className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Wi-Fi & Contribution Status */}
                  <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/40">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Wifi className="h-3.5 w-3.5 text-blue-500" />
                      <span>Wi-Fi:</span>
                      <span className="font-semibold text-foreground">
                        {item.hasWifi ? "Available" : "Not listed"}
                      </span>
                    </div>

                    {submission ? (
                      <Badge
                        variant={submission.status === "approved" ? "success" : "warning"}
                        className="text-[10px] uppercase font-semibold gap-1"
                      >
                        {submission.status === "approved" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Approved (+50 XP)
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            Pending Review
                          </>
                        )}
                      </Badge>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (place) onOpenWifiSubmission(place);
                          else toast.info("Wi-Fi submission requires active location.");
                        }}
                        className="text-[11px] font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        Contribute Wi-Fi (+20 XP)
                      </button>
                    )}
                  </div>

                  {/* Personal Notes */}
                  <div className="mt-2.5">
                    {isEditingNotes ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          placeholder="Add your personal notes about this spot (seating, outlets, vibes)..."
                          className="w-full text-xs p-2 rounded-xl border border-border bg-muted/40 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingNotesId(null)}
                            className="h-7 text-[11px] px-2 rounded-lg"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleSaveNotes(item.placeId)}
                            className="h-7 text-[11px] px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white gap-1"
                          >
                            <Save className="h-3 w-3" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleStartEditNotes(item)}
                        className="cursor-pointer rounded-xl bg-muted/30 p-2 text-xs text-muted-foreground hover:bg-muted/50 transition flex items-center justify-between group/note"
                      >
                        <p className="truncate italic">
                          {item.notes ? `"${item.notes}"` : "Add personal notes..."}
                        </p>
                        <Edit3 className="h-3 w-3 text-muted-foreground opacity-60 group-hover/note:opacity-100 shrink-0 ml-1" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 flex items-center justify-between border-t border-border/40 text-xs">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    {item.city || "Collected Spot"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenPlaceProfile(item.placeId)}
                    className="h-7 text-xs font-semibold text-blue-500 hover:text-blue-600 gap-1 px-2 rounded-lg"
                  >
                    <span>View in Mapify</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

