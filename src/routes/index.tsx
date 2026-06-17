import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { MapPin, Search as SearchIcon, Star, Plus, ShoppingBag, Heart, ChevronDown, Wallet, Mic, X, ChevronRight, Clock, Trash2, Share2, MoreHorizontal, Loader2, Compass } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getFoodItems } from "@/lib/db.functions";
import { BottomNav } from "@/components/bottom-nav";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney } from "@/lib/restaurant.config";
import { toast } from "sonner";
import { MOCK_CATEGORIES } from "@/lib/mock-food";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Our Kitchen — Order food in" },
      { name: "description", content: "Signature burgers, pizza & desserts delivered hot in 25–30 minutes." },
      { property: "og:title", content: "Our Kitchen — Order food in" },
      { property: "og:description", content: "Signature burgers, pizza & desserts delivered hot." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [category, setCategory] = useState<string | null>(null);
  const { add, count } = useCart();
  const { user } = useAuth();

  const getFoodItemsFn = useServerFn(getFoodItems);

  const { data: foodItems = [] } = useQuery({
    queryKey: ["foodItems"],
    queryFn: async () => {
      const res = await getFoodItemsFn({ data: "all" });
      if (res && typeof res === "object" && "error" in res) {
        toast.error(`Database Error: ${(res as any).error}`, { duration: 10000 });
        return [];
      }
      return (res || []) as any[];
    },
  });

  const categories = MOCK_CATEGORIES;

  const popular = foodItems.filter((f) => {
    if (category && f.category_id !== category) return false;
    return true;
  });

  const recommended = foodItems.filter((f) => f.is_recommended);

  const displayCategories = [
    { id: null, name: "Meal" }, // "All" maps to "Meal" to keep the mockup's visual style
    ...MOCK_CATEGORIES
  ];

  // --- LOCATION & PROFILE STATES & HANDLERS ---
  const [selectedLocation, setSelectedLocation] = useState<{
    title: string;
    address: string;
    fullAddress: string;
    lat?: number;
    lng?: number;
  }>({
    title: "Kaipally",
    address: "Poonjar Thekkekara",
    fullAddress: "Kaipally, Poonjar Thekkekara",
    lat: 9.6824,
    lng: 76.9083
  });

  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [recentLocations, setRecentLocations] = useState<any[]>([]);
  const [showLocationDrawer, setShowLocationDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("Home");
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("+91-8590014578");
  const [currentLocLoading, setCurrentLocLoading] = useState(false);
  const [importingBlinkit, setImportingBlinkit] = useState(false);
  const [importingStep, setImportingStep] = useState("");

  const userInitial = user
    ? (user.user_metadata?.name?.[0] || user.email?.[0] || "A").toUpperCase()
    : "A";

  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. Selected location
      const savedSel = localStorage.getItem("grillgo.selected_location");
      if (savedSel) {
        try {
          const parsed = JSON.parse(savedSel);
          if (parsed && typeof parsed === "object" && typeof parsed.title === "string" && typeof parsed.address === "string") {
            setSelectedLocation(parsed);
          } else {
            localStorage.removeItem("grillgo.selected_location");
          }
        } catch (e) {
          localStorage.removeItem("grillgo.selected_location");
        }
      }
      if (!localStorage.getItem("grillgo.selected_location")) {
        const defaultLoc = {
          title: "Kaipally",
          address: "Poonjar Thekkekara",
          fullAddress: "Kaipally, Poonjar Thekkekara",
          lat: 9.6824,
          lng: 76.9083
        };
        setSelectedLocation(defaultLoc);
        localStorage.setItem("grillgo.selected_location", JSON.stringify(defaultLoc));
      }

      // 2. Saved addresses
      const savedAddrs = localStorage.getItem("grillgo.saved_addresses");
      if (savedAddrs) {
        try {
          const parsed = JSON.parse(savedAddrs);
          if (Array.isArray(parsed) && parsed.every(item => item && typeof item === "object" && typeof item.title === "string" && typeof item.address === "string")) {
            setSavedAddresses(parsed);
          } else {
            localStorage.removeItem("grillgo.saved_addresses");
          }
        } catch (e) {
          localStorage.removeItem("grillgo.saved_addresses");
        }
      }
      if (!localStorage.getItem("grillgo.saved_addresses")) {
        const defaults = [
          {
            id: "mock-saved-1",
            title: "Home",
            address: "padinjarekara house karoor PO pala, opposite of pala steels godawn, 686574, Lalam, India",
            phone: "+91-8590014578",
            distance: "18.3 km",
            lat: 9.7104,
            lng: 76.6830
          },
          {
            id: "mock-saved-2",
            title: "Home",
            address: "shamla hostel near freedom mart, Thrikkakara, Edappally, Kochi",
            phone: "+91-8590014578",
            distance: "68 km",
            lat: 10.0261,
            lng: 76.3125
          }
        ];
        setSavedAddresses(defaults);
        localStorage.setItem("grillgo.saved_addresses", JSON.stringify(defaults));
      }

      // 3. Recent locations
      const savedRecents = localStorage.getItem("grillgo.recent_locations");
      if (savedRecents) {
        try {
          const parsed = JSON.parse(savedRecents);
          if (Array.isArray(parsed) && parsed.every(item => item && typeof item === "object" && typeof item.title === "string" && typeof item.address === "string")) {
            setRecentLocations(parsed);
          } else {
            localStorage.removeItem("grillgo.recent_locations");
          }
        } catch (e) {
          localStorage.removeItem("grillgo.recent_locations");
        }
      }
      if (!localStorage.getItem("grillgo.recent_locations")) {
        const defaults = [
          {
            id: "mock-recent-1",
            title: "Kaipally",
            address: "Poonjar Thekkekara",
            distance: "1.8 km",
            lat: 9.6824,
            lng: 76.9083
          },
          {
            id: "mock-recent-2",
            title: "Home",
            address: "shamla hostel near freedom mart, Thrikkakara, Edappally, Kochi",
            distance: "68 km",
            lat: 10.0261,
            lng: 76.3125
          }
        ];
        setRecentLocations(defaults);
        localStorage.setItem("grillgo.recent_locations", JSON.stringify(defaults));
      }
    }
  }, []);

  const handleSelectLocation = (loc: { title: string; address: string; lat?: number; lng?: number }) => {
    const fullAddress = loc.address
      ? (loc.address.startsWith(loc.title) ? loc.address : `${loc.title}, ${loc.address}`)
      : loc.title;

    const newLoc = {
      title: loc.title,
      address: loc.address,
      fullAddress,
      lat: loc.lat || 9.6824,
      lng: loc.lng || 76.9083
    };

    setSelectedLocation(newLoc);
    localStorage.setItem("grillgo.selected_location", JSON.stringify(newLoc));

    // Update recent locations list
    const updatedRecents = [
      {
        id: `recent-${Date.now()}`,
        title: loc.title,
        address: loc.address,
        distance: loc.distance || "0.1 km",
        lat: loc.lat,
        lng: loc.lng
      },
      ...recentLocations.filter(r => r.address !== loc.address && r.title !== loc.title)
    ].slice(0, 5);

    setRecentLocations(updatedRecents);
    localStorage.setItem("grillgo.recent_locations", JSON.stringify(updatedRecents));

    setShowLocationDrawer(false);
    toast.success(`Delivery address changed to ${loc.title}`);
  };

  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      return;
    }
    setCurrentLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`);
          if (res.ok) {
            const data = await res.json();
            const displayName = data.display_name || "";
            // Extract a reasonable title from address details
            const parts = displayName.split(",");
            const title = parts[0] || "Current Location";
            const address = parts.slice(1).join(",").trim() || `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            
            handleSelectLocation({
              title,
              address,
              lat: latitude,
              lng: longitude
            });
          } else {
            handleSelectLocation({
              title: "Current Location",
              address: `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              lat: latitude,
              lng: longitude
            });
          }
        } catch (err) {
          console.error(err);
          handleSelectLocation({
            title: "Current Location",
            address: `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            lat: latitude,
            lng: longitude
          });
        } finally {
          setCurrentLocLoading(false);
        }
      },
      (err) => {
        setCurrentLocLoading(false);
        toast.error("Failed to get location. Using default demo location.");
        handleSelectLocation({
          title: "Kaipally",
          address: "Poonjar Thekkekara",
          lat: 9.6824,
          lng: 76.9083
        });
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleSaveNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim()) {
      toast.error("Please enter an address");
      return;
    }
    const newAddrItem = {
      id: `saved-${Date.now()}`,
      title: newTitle,
      address: newAddress,
      phone: newPhone,
      distance: "0.1 km",
      lat: 9.6824,
      lng: 76.9083
    };

    const updated = [newAddrItem, ...savedAddresses];
    setSavedAddresses(updated);
    localStorage.setItem("grillgo.saved_addresses", JSON.stringify(updated));

    // Reset form
    setNewAddress("");
    setShowAddForm(false);
    toast.success("New address added successfully!");
    
    // Auto-select the newly added address
    handleSelectLocation(newAddrItem);
  };

  const handleImportBlinkit = () => {
    setImportingBlinkit(true);
    setImportingStep("Connecting to Blinkit...");
    
    setTimeout(() => {
      setImportingStep("Verifying phone number (+91-8590014578)...");
      
      setTimeout(() => {
        setImportingStep("Fetching saved addresses from Blinkit cloud...");
        
        setTimeout(() => {
          // Add address
          const importedAddr = {
            id: `blinkit-${Date.now()}`,
            title: "Home (Imported)",
            address: "padinjarekara house karoor PO pala, opposite of pala steels godawn, 686574, Lalam, India",
            phone: "+91-8590014578",
            distance: "18.3 km",
            lat: 9.7104,
            lng: 76.6830
          };
          
          const updated = [importedAddr, ...savedAddresses];
          setSavedAddresses(updated);
          localStorage.setItem("grillgo.saved_addresses", JSON.stringify(updated));
          
          setImportingBlinkit(false);
          setImportingStep("");
          toast.success("Address imported from Blinkit successfully!");
          
          // Auto-select
          handleSelectLocation(importedAddr);
        }, 1200);
      }, 1200);
    }, 1000);
  };

  const handleDeleteAddress = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedAddresses.filter(a => a.id !== id);
    setSavedAddresses(updated);
    localStorage.setItem("grillgo.saved_addresses", JSON.stringify(updated));
    toast.success("Address removed");
  };

  const handleShareAddress = (addressText: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(addressText);
    toast.success("Address copied to clipboard!");
  };

  const filteredSavedAddresses = (savedAddresses || []).filter(a => 
    a && 
    typeof a.title === "string" && 
    typeof a.address === "string" && 
    (a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     a.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredRecentLocations = (recentLocations || []).filter(r => 
    r && 
    typeof r.title === "string" && 
    typeof r.address === "string" && 
    (r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     r.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#F5EBD0] pb-6">
      {/* Header */}
      <header className="bg-[#7F011F] text-white px-5 pt-6 pb-6 shadow-md rounded-b-[2rem]">
        <div className="flex items-center justify-between">
          <button 
            type="button"
            onClick={() => setShowLocationDrawer(true)} 
            className="flex items-start gap-2.5 text-left focus:outline-none hover:opacity-90 transition-opacity max-w-[70%]"
          >
            {/* White location pin with outline circle */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/25">
              <MapPin className="h-5 w-5 text-white fill-white/20" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 font-bold text-[15px] text-white">
                <span className="truncate">{selectedLocation.title}</span>
                <ChevronDown className="h-4 w-4 text-[#F5EBD0] opacity-80 shrink-0" />
              </div>
              <div className="text-[11px] text-[#F5EBD0]/80 line-clamp-1 font-medium mt-0.5">
                {selectedLocation.address}
              </div>
            </div>
          </button>
          
          <div className="flex items-center gap-3">
            {/* Wallet Icon */}
            <button 
              type="button"
              onClick={() => toast.info("Your Wallet Balance: ₹450.00 (GrillGo Rewards Active)")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors shrink-0"
              aria-label="Wallet balance"
            >
              <Wallet className="h-4.5 w-4.5" />
            </button>
            
            {/* Profile Initials Avatar */}
            <Link 
              to="/profile" 
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A73E8] font-bold text-white text-sm shadow-md hover:bg-[#1557B0] transition-colors border border-white/10 shrink-0"
            >
              {userInitial}
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Link
              to="/search"
              className="w-full flex items-center justify-between rounded-full bg-white px-4.5 py-2.5 text-sm text-muted-foreground hover:bg-white/95 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3">
                <SearchIcon className="h-4.5 w-4.5 text-[#7F011F]" />
                <span className="text-xs font-medium text-[#8B7A6C]">Search "coffee"</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-px bg-[#E5D5B8]" />
                <Mic className="h-4 w-4 text-[#7F011F]" />
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Categories Section with Circular Outlined Icons */}
      <section className="mt-6">
        <h3 className="px-5 text-sm font-extrabold text-[#2E251B]">Categories</h3>
        <div className="mt-3 flex gap-4 overflow-x-auto no-scrollbar px-5 pb-2">
          {displayCategories.map((c) => (
            <CategoryCircle
              key={c.name}
              label={c.name}
              active={category === c.id}
              onClick={() => {
                setCategory(c.id);
                if (c.isStatic) {
                  toast.info(`${c.name} category is coming soon!`);
                }
              }}
            />
          ))}
        </div>
      </section>

      {/* Best Seller Section (Horizontal Scroll) */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between px-5">
          <h3 className="text-sm font-extrabold text-[#2E251B]">Best Seller</h3>
          <Link to="/search" className="text-xs font-bold text-[#7F011F] hover:underline">View All &gt;</Link>
        </div>
        <div className="mt-3 flex gap-4 overflow-x-auto no-scrollbar px-5 pb-2">
          {recommended?.map((f) => (
            <Link
              key={f.id}
              to="/food/$id"
              params={{ id: f.id }}
              className="w-36 shrink-0 overflow-hidden rounded-3xl bg-card shadow-card hover:scale-[1.02] transition-transform"
            >
              <div className="relative h-28 w-full bg-muted">
                <img src={f.image ?? ""} alt={f.name} className="h-full w-full object-cover" />
                <span className="absolute bottom-2 right-2 rounded-full bg-[#7F011F] px-2.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                  {formatMoney(Number(f.price))}
                </span>
              </div>
              <div className="p-3">
                <div className="text-xs font-bold leading-tight text-[#2E251B] line-clamp-1">{f.name}</div>
                <div className="mt-0.5 text-[9px] text-muted-foreground">{f.restaurant_name}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Special Offer Banner */}
      <section className="mt-6 px-5">
        <div className="flex overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#9C1331] to-[#7F011F] shadow-soft text-white relative">
          <div className="flex-1 p-6 z-10">
            <p className="text-xs font-semibold tracking-wide text-white/90">Experience our</p>
            <p className="text-xs font-semibold tracking-wide text-white/90">delicious new dish</p>
            <h2 className="mt-1.5 text-3xl font-extrabold leading-tight tracking-tight">
              30% OFF
            </h2>
          </div>
          <div className="relative w-36 h-28 self-center overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400"
              alt="Pizza Offer"
              className="absolute -right-2 top-1/2 -translate-y-1/2 h-36 w-36 object-cover rounded-full border-4 border-white/20 shadow-md transform rotate-12"
            />
          </div>
        </div>
      </section>

      {/* Recommend Section (2-Column Grid) */}
      <section className="mt-6 px-5 pb-24">
        <h3 className="text-sm font-extrabold text-[#2E251B]">Recommend</h3>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {popular?.map((f) => (
            <div key={f.id} className="relative overflow-hidden rounded-3xl bg-card shadow-card hover:scale-[1.01] transition-transform">
              <Link to="/food/$id" params={{ id: f.id }} className="block">
                <div className="relative h-36 w-full bg-muted">
                  <img src={f.image ?? ""} alt={f.name} className="h-full w-full object-cover" />
                  
                  {/* Rating Badge */}
                  <span className="absolute left-3 top-3 inline-flex items-center gap-0.5 rounded-full bg-white/90 backdrop-blur-xs px-2 py-0.5 text-[9px] font-extrabold text-[#2E251B] shadow-sm">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    {Number(f.rating).toFixed(1)}
                  </span>
                  
                  {/* Heart Icon */}
                  <button className="absolute right-3 top-3 flex h-6.5 w-6.5 items-center justify-center rounded-full bg-white/95 backdrop-blur-xs text-[#7F011F] shadow-sm hover:bg-white transition-colors">
                    <Heart className="h-3.5 w-3.5 fill-[#7F011F]" />
                  </button>

                  {/* Price Tag in Bottom Right */}
                  <span className="absolute right-3 bottom-3 rounded-full bg-[#7F011F] px-2.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                    {formatMoney(Number(f.price))}
                  </span>
                </div>
              </Link>
              <div className="p-3">
                <div className="font-bold text-xs text-[#2E251B] line-clamp-1">{f.name}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">{f.restaurant_name}</span>
                  <button
                    onClick={() => {
                      add({ food_id: f.id, name: f.name, image: f.image, price: Number(f.price) });
                      toast.success(`${f.name} added to cart`);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7F011F] text-white hover:bg-[#630016] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {popular && popular.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">No items in this category.</p>
        )}
      </section>

      <WhatsAppFab />
      <BottomNav />

      {/* --- LOCATION DRAWER --- */}
      {showLocationDrawer && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 z-40 max-w-[28rem] mx-auto transition-opacity animate-in fade-in duration-200"
            onClick={() => {
              if (!importingBlinkit) setShowLocationDrawer(false);
            }}
          />
          
          {/* Drawer Container */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#121214] text-white rounded-t-[2.5rem] border-t border-[#1E1E22] shadow-2xl px-5 pt-6 pb-8 max-w-[28rem] mx-auto overflow-y-auto max-h-[85vh] transition-transform animate-in slide-in-from-bottom duration-300 no-scrollbar">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1E1E22]">
              <div className="flex items-center gap-2">
                <ChevronDown 
                  className="h-6 w-6 text-[#A1A1AA] cursor-pointer hover:text-white" 
                  onClick={() => setShowLocationDrawer(false)}
                />
                <span className="font-bold text-lg text-white">Select a location</span>
              </div>
              <button 
                onClick={() => setShowLocationDrawer(false)}
                className="p-1 rounded-full hover:bg-[#1E1E22] transition-colors"
              >
                <X className="h-5 w-5 text-[#A1A1AA]" />
              </button>
            </div>

            {/* Search Bar inside Drawer */}
            <div className="mt-4 relative">
              <SearchIcon className="absolute left-4.5 top-3.5 h-4.5 w-4.5 text-[#7E6C57]" />
              <input
                type="text"
                placeholder="Search for area, street name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1E1E22] border border-[#2E2E33] rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-[#7E6C57] focus:outline-none focus:border-[#7F011F]/50 transition-colors"
              />
            </div>

            {/* Quick Actions List */}
            <div className="mt-4 bg-[#1E1E22] rounded-2xl overflow-hidden border border-[#2E2E33]">
              {/* Use Current Location */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={currentLocLoading}
                className="w-full flex items-center justify-between px-4.5 py-4 border-b border-[#2E2E33] hover:bg-[#2E2E33] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EA4335]/15 border border-[#EA4335]/30 text-[#EA4335]">
                    {currentLocLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Compass className="h-4.5 w-4.5 text-[#EA4335]" />
                    )}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#EA4335]">Use current location</div>
                    <div className="text-[10px] text-[#A1A1AA] mt-0.5 line-clamp-1">
                      {currentLocLoading ? "Detecting GPS location..." : "Kaipally, Poonjar Thekkekara"}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#A1A1AA]" />
              </button>

              {/* Add Address */}
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="w-full flex items-center justify-between px-4.5 py-4 border-b border-[#2E2E33] hover:bg-[#2E2E33] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EA4335]/15 border border-[#EA4335]/30 text-[#EA4335]">
                    <Plus className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#EA4335]">Add Address</div>
                    <div className="text-[10px] text-[#A1A1AA] mt-0.5">Enter custom address details manually</div>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 text-[#A1A1AA] transition-transform ${showAddForm ? "rotate-90" : ""}`} />
              </button>

              {/* Import from Blinkit */}
              <button
                type="button"
                onClick={handleImportBlinkit}
                disabled={importingBlinkit}
                className="w-full flex items-center justify-between px-4.5 py-4 hover:bg-[#2E2E33] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7E135] text-black font-extrabold text-[8px] select-none uppercase tracking-tighter shrink-0">
                    blinkit
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#EA4335]">Import addresses from Blinkit</div>
                    <div className="text-[10px] text-[#A1A1AA] mt-0.5">Sync saved addresses with one tap</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#A1A1AA]" />
              </button>
            </div>

            {/* Add Custom Address Form */}
            {showAddForm && (
              <form onSubmit={handleSaveNewAddress} className="mt-4 p-4 bg-[#1E1E22] rounded-2xl border border-[#2E2E33] space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider">Add Custom Address</div>
                
                <div>
                  <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase">Address Label</label>
                  <div className="flex gap-2 mt-1">
                    {["Home", "Work", "Other"].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setNewTitle(l)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                          newTitle === l 
                            ? "bg-[#7F011F] text-white" 
                            : "bg-[#2E2E33] text-[#A1A1AA] hover:bg-[#3E3E44]"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase">Full Address</label>
                  <textarea
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="Enter flat/house no, street, locality..."
                    className="w-full bg-[#2E2E33] border border-[#3E3E44] rounded-lg p-2.5 mt-1 text-xs text-white placeholder-[#7E6C57] focus:outline-none focus:border-[#7F011F]/50 resize-none h-16"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#A1A1AA] uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. +91-8590014578"
                    className="w-full bg-[#2E2E33] border border-[#3E3E44] rounded-lg p-2.5 mt-1 text-xs text-white placeholder-[#7E6C57] focus:outline-none focus:border-[#7F011F]/50"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold bg-[#7F011F] text-white rounded-xl hover:bg-[#630016] transition-colors"
                  >
                    Save & Use Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-xs font-bold bg-[#2E2E33] text-[#A1A1AA] rounded-xl hover:bg-[#3E3E44] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Blinkit Syncing Progress */}
            {importingBlinkit && (
              <div className="mt-4 p-5 bg-[#1E1E22] rounded-2xl border border-[#2E2E33] flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
                <Loader2 className="h-6 w-6 animate-spin text-[#F7E135]" />
                <div className="text-xs font-bold text-[#F7E135] uppercase tracking-wider">Blinkit Address Sync</div>
                <div className="text-[11px] text-white font-medium">{importingStep}</div>
              </div>
            )}

            {/* Saved Addresses Section */}
            <div className="mt-6">
              <div className="text-[10px] font-bold tracking-wider text-[#A1A1AA] uppercase mb-2">Saved Addresses</div>
              <div className="space-y-3">
                {filteredSavedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => handleSelectLocation(addr)}
                    className="flex gap-3 p-4 bg-[#1E1E22] rounded-2xl border border-[#2E2E33] hover:border-[#7F011F]/30 hover:bg-[#2E2E33]/30 transition-all cursor-pointer text-left group"
                  >
                    {/* Left icon with distance badge */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-11">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2E2E33] text-[#A1A1AA] group-hover:text-white transition-colors">
                        <Home className="h-5 w-5" />
                      </div>
                      <div className="text-[9px] text-[#A1A1AA] font-bold mt-1 tracking-tight">{addr.distance}</div>
                    </div>

                    {/* Middle details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-white leading-tight">{addr.title}</div>
                      <div className="text-[11px] text-[#A1A1AA] mt-1.5 leading-relaxed font-medium break-words">
                        {addr.address}
                      </div>
                      {addr.phone && (
                        <div className="text-[10px] text-[#EA4335] mt-1.5 font-semibold">
                          Phone number: {addr.phone}
                        </div>
                      )}

                      {/* Actions row */}
                      <div className="flex items-center gap-4.5 mt-3 pt-2 border-t border-[#2E2E33]">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.info("More features coming soon!");
                          }}
                          className="p-1 rounded hover:bg-[#2E2E33] transition-colors"
                          title="More options"
                        >
                          <MoreHorizontal className="h-4 w-4 text-[#A1A1AA] hover:text-white" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => handleShareAddress(addr.address, e)}
                          className="p-1 rounded hover:bg-[#2E2E33] transition-colors"
                          title="Share address"
                        >
                          <Share2 className="h-4 w-4 text-[#A1A1AA] hover:text-white" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => handleDeleteAddress(addr.id, e)}
                          className="p-1 rounded hover:bg-[#2E2E33] transition-colors"
                          title="Delete address"
                        >
                          <Trash2 className="h-4 w-4 text-[#A1A1AA] hover:text-[#EA4335]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredSavedAddresses.length === 0 && (
                  <div className="text-center text-xs text-[#A1A1AA] py-4 bg-[#1E1E22] rounded-2xl border border-[#2E2E33]">
                    No matching saved addresses.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Locations Section */}
            <div className="mt-6">
              <div className="text-[10px] font-bold tracking-wider text-[#A1A1AA] uppercase mb-2">Recent Locations</div>
              <div className="space-y-3">
                {filteredRecentLocations.map((loc) => (
                  <div
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className="flex gap-3 p-4 bg-[#1E1E22] rounded-2xl border border-[#2E2E33] hover:border-[#7F011F]/30 hover:bg-[#2E2E33]/30 transition-all cursor-pointer text-left group"
                  >
                    {/* Left icon with distance badge */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-11">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2E2E33] text-[#A1A1AA] group-hover:text-white transition-colors">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="text-[9px] text-[#A1A1AA] font-bold mt-1 tracking-tight">{loc.distance}</div>
                    </div>

                    {/* Middle details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-white leading-tight">{loc.title}</div>
                      <div className="text-[11px] text-[#A1A1AA] mt-1 line-clamp-2 font-medium">
                        {loc.address}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredRecentLocations.length === 0 && (
                  <div className="text-center text-xs text-[#A1A1AA] py-4 bg-[#1E1E22] rounded-2xl border border-[#2E2E33]">
                    No matching recent locations.
                  </div>
                )}
              </div>
            </div>

            {/* Powered by Google Footer */}
            <div className="mt-8 flex items-center justify-center gap-1.5 opacity-60">
              <span className="text-[10px] text-[#A1A1AA] font-semibold">powered by</span>
              <span className="text-xs font-black tracking-tight text-white select-none">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC05]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
              </span>
            </div>
            
          </div>
        </>
      )}
    </div>
  );
}

function CategoryIcon({ name, className = "h-7 w-7" }: { name: string; className?: string }) {
  const n = name.toLowerCase();
  if (n === "mandi") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 10h16M3 10c0 5 4 8 9 8s9-3 9-8" />
        <path d="M12 6V3M9 6v4M15 6v4" />
        <path d="M2 9c.5-2 2-3 4-3h12c2 0 3.5 1 4 3" />
      </svg>
    );
  }
  if (n === "al faham" || n === "alfaham") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2c1 2 3 3.5 3 5.5a3 3 0 01-6 0c0-2 2-3.5 3-5.5z" />
        <path d="M5 12h14M3 16h18M6 20h12" />
        <path d="M7 12v8M12 12v8M17 12v8" />
      </svg>
    );
  }
  if (n === "shawarma") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M7 3h10v3H7zM9 6h6v12l-3 3-3-3zM8 9h8M8 12h8M9 15h6" />
      </svg>
    );
  }
  if (n === "burgers" || n === "burger") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 11c0-4.5 4-7 9-7s9 2.5 9 7" />
        <path d="M2 11.5h20" />
        <path d="M3 14h18" />
        <path d="M4 14c0 3 3.5 4.5 8 4.5s8-1.5 8-4.5" />
        <circle cx="7" cy="7" r="0.5" fill="currentColor" />
        <circle cx="11" cy="6" r="0.5" fill="currentColor" />
        <circle cx="15" cy="7" r="0.5" fill="currentColor" />
      </svg>
    );
  }
  if (n === "pizza") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M15 11l-5 5" />
        <path d="M19 12c0-3.8-3-7-7-7-2 0-3.9.8-5.2 2.2L19 19c.7-1.3 1-2.8 1-4.2z" />
        <path d="M4.5 7.2L12 20c.5 0 1-.2 1.4-.5L4.5 7.2z" />
        <circle cx="11" cy="10" r="1.2" fill="currentColor" />
        <circle cx="14" cy="14" r="1.2" fill="currentColor" />
        <circle cx="8" cy="14" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (n === "sandwiches" || n === "sandwich" || n === "snacks" || n === "snack") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 11c0 5 4 8 9 8s9-3 9-8" />
        <path d="M2 11h20" />
        <path d="M6 8c.5-1 1.5-2 3-1.5s2 1.5 2 3" />
        <path d="M12 7c.5-1.5 2-2 3.5-1s1.5 2 1.5 3" />
        <path d="M9 10c0-1.5 1-2.5 2.5-2.5s2 1 2 2.5" />
      </svg>
    );
  }
  if (n === "desserts" || n === "dessert") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 12h14l-2 9H7l-2-9z" />
        <path d="M5 12c-1.5-1.5-1-4 1-4.5s3 0 3 2.5c0-2.5 2-3.5 4-3s3 2 3 5" />
        <path d="M16 12c2.5-1 3-3.5 1.5-5s-3 .5-3.5 3" />
        <circle cx="12" cy="4.5" r="1.5" fill="currentColor" />
        <path d="M13.5 4.5c.5-1.5 2-2 3.5-1" />
      </svg>
    );
  }
  if (n === "drinks" || n === "drink") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M6 8h12l-1.5 13h-9L6 8z" />
        <path d="M5 8h14" />
        <path d="M7 8c0-1.5 2-2 5-2s5 .5 5 2" />
        <path d="M12 6l2-4h3" />
      </svg>
    );
  }
  if (n === "juices" || n === "juice") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M6 9h12v11a2 2 0 01-2 2H8a2 2 0 01-2-2V9zM5 9h14M10 9V5M9 5h6" />
        <circle cx="12" cy="15" r="2" />
      </svg>
    );
  }
  if (n === "shakes" || n === "shake") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M7 8h10l-1.5 10c-.5 2-2 3-3.5 3s-3-1-3.5-3L7 8z" />
        <path d="M12 8c0-2 1.5-3 3-3M6 8c0-3 3-4 6-4s6 1 6 4" />
        <path d="M14 5l3-3" />
      </svg>
    );
  }
  if (n === "hot" || n === "tea" || n === "coffee") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17 8h1a4 4 0 110 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zM6 2v3M10 2v3M14 2v3" />
      </svg>
    );
  }
  if (n === "lime" || n === "lemon") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" />
      </svg>
    );
  }
  if (n === "mojitos" || n === "mojito") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 3h14v16a2 2 0 01-2 2H7a2 2 0 01-2-2V3zM15 3l-1.5 5" />
        <path d="M8 8h8M5 13h14" />
        <circle cx="12" cy="10" r="1" fill="currentColor" />
        <circle cx="10" cy="15" r="1.5" />
      </svg>
    );
  }
  if (n === "vegan") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 21V10" />
        <path d="M12 10C8.5 10 7 7 9 4.5s5-1 5 1.5c1-1.5 3-1.5 4 .5s0 3.5-2 3.5" />
        <path d="M12 13c-2-1-3-3-2-5.5s3.5-1.5 4 1" />
      </svg>
    );
  }
  // Default "Meal" / Fork & Knife
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3v8a1 1 0 001 1h3a1 1 0 001-1V3" />
      <path d="M8 3v4" />
      <path d="M8.5 12v9" />
      <path d="M16 3v10c0 .5-.2 1-.5 1.5L14 18.5V21" />
      <path d="M16 3c-1.5 1-2 4-2 7h2" />
    </svg>
  );
}

function CategoryCircle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 focus:outline-none"
    >
      <div
        className={`flex h-15 w-15 items-center justify-center rounded-full border-2 transition-all ${
          active
            ? "border-[#7F011F] bg-[#FCE6E9] text-[#7F011F] scale-105 shadow-sm"
            : "border-[#E5D5B8] bg-white text-[#7F011F]/80 hover:border-[#7F011F]/40"
        }`}
      >
        <CategoryIcon name={label} className="h-6 w-6" />
      </div>
      <span
        className={`text-[10px] font-bold tracking-wide ${
          active ? "text-[#7F011F]" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
