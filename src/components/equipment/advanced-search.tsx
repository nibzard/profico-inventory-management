'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Filter,
  X,
  Calendar,
  Euro,
  MapPin,
  Tag,
  Building,
  User,
  Clock,
  SlidersHorizontal
} from 'lucide-react';
import { format } from 'date-fns';

interface AdvancedSearchFilters {
  search: string;
  category: string;
  status: string;
  owner: string;
  location: string;
  brand: string;
  purchaseMethod: string;
  priceMin: string;
  priceMax: string;
  purchaseDateFrom: string;
  purchaseDateTo: string;
  team: string;
  tags: string[];
}

interface AdvancedSearchProps {
  categories: string[];
  users: { id: string; name: string; teamId?: string | null }[];
  teams: { id: string; name: string }[];
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
  currentFilters: Partial<AdvancedSearchFilters>;
}

export function AdvancedSearch({
  categories,
  users,
  teams,
  onFiltersChange,
  currentFilters,
}: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<AdvancedSearchFilters>({
    search: '',
    category: 'all',
    status: 'all',
    owner: 'all',
    location: '',
    brand: '',
    purchaseMethod: 'all',
    priceMin: '',
    priceMax: '',
    purchaseDateFrom: '',
    purchaseDateTo: '',
    team: 'all',
    tags: [],
    ...currentFilters,
  });
  const [tagInput, setTagInput] = useState('');

  const statusOptions = [
    { value: 'available', label: 'Available' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'broken', label: 'Broken' },
    { value: 'decommissioned', label: 'Decommissioned' },
  ];

  const purchaseMethodOptions = [
    { value: 'profi_co', label: 'ProfiCo' },
    { value: 'zopi', label: 'ZOPI' },
    { value: 'leasing', label: 'Leasing' },
    { value: 'off_the_shelf', label: 'Off-the-shelf' },
  ];

  const applyFilters = () => {
    onFiltersChange(filters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const clearedFilters: AdvancedSearchFilters = {
      search: '',
      category: 'all',
      status: 'all',
      owner: 'all',
      location: '',
      brand: '',
      purchaseMethod: 'all',
      priceMin: '',
      priceMax: '',
      purchaseDateFrom: '',
      purchaseDateTo: '',
      team: 'all',
      tags: [],
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    setIsOpen(false);
  };

  const addTag = () => {
    if (tagInput.trim() && !filters.tags.includes(tagInput.trim())) {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'tags') return value.length > 0;
    return value !== '' && value !== 'all' && value !== null;
  });

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'tags') return value.length > 0;
    return value !== '' && value !== 'all' && value !== null;
  }).length;

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search equipment by name, serial number, brand, or description..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="pl-10 pr-24"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              applyFilters();
            }
          }}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount}
            </Badge>
          )}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[600px] p-0" align="end">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Advanced Search</h3>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                      <Button size="sm" onClick={applyFilters}>
                        Apply
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Basic Filters */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Category</Label>
                        <Select
                          value={filters.category}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <Select
                          value={filters.status}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Owner</Label>
                        <Select
                          value={filters.owner}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, owner: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All owners" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All owners</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Team</Label>
                        <Select
                          value={filters.team}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, team: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All teams" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All teams</SelectItem>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Advanced Filters */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Brand</Label>
                        <Input
                          placeholder="Filter by brand..."
                          value={filters.brand}
                          onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Location</Label>
                        <Input
                          placeholder="Filter by location..."
                          value={filters.location}
                          onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Purchase Method</Label>
                        <Select
                          value={filters.purchaseMethod}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, purchaseMethod: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="All methods" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All methods</SelectItem>
                            {purchaseMethodOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Tags</Label>
                        <div className="flex space-x-2 mt-1">
                          <Input
                            placeholder="Add tags..."
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addTag();
                              }
                            }}
                            className="flex-1"
                          />
                          <Button variant="outline" size="sm" onClick={addTag}>
                            Add
                          </Button>
                        </div>
                        {filters.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {filters.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                                <button
                                  onClick={() => removeTag(tag)}
                                  className="ml-1 hover:text-destructive"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Price Range */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Price Range</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Min Price (€)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={filters.priceMin}
                          onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Max Price (€)</Label>
                        <Input
                          type="number"
                          placeholder="No limit"
                          value={filters.priceMax}
                          onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Purchase Date Range</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">From</Label>
                        <Input
                          type="date"
                          value={filters.purchaseDateFrom}
                          onChange={(e) => setFilters(prev => ({ ...prev, purchaseDateFrom: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">To</Label>
                        <Input
                          type="date"
                          value={filters.purchaseDateTo}
                          onChange={(e) => setFilters(prev => ({ ...prev, purchaseDateTo: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}