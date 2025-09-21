// ABOUTME: Equipment categories and tags management component
// ABOUTME: Provides comprehensive categorization and tagging system for equipment organization

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Tag,
  FolderOpen,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  Hash,
  Palette,
  Shield,
  Monitor,
  Smartphone,
  Printer,
  Server,
  Wifi,
  Headphones,
  Camera,
  Gamepad,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  equipmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Tag {
  id: string;
  name: string;
  description: string;
  color: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface EquipmentCategoriesTagsProps {
  equipmentId?: string;
  onSelectionChange?: (categories: string[], tags: string[]) => void;
  selectedCategories?: string[];
  selectedTags?: string[];
  canManage?: boolean;
}

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name too long"),
  description: z.string().max(200, "Description too long").optional(),
  color: z.string().min(4, "Color is required"),
  icon: z.string().min(1, "Icon is required"),
});

const tagSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name too long"),
  description: z.string().max(200, "Description too long").optional(),
  color: z.string().min(4, "Color is required"),
});

type CategoryFormData = z.infer<typeof categorySchema>;
type TagFormData = z.infer<typeof tagSchema>;

const categoryIcons = [
  { value: "monitor", label: "Monitor", icon: Monitor },
  { value: "smartphone", label: "Smartphone", icon: Smartphone },
  { value: "printer", label: "Printer", icon: Printer },
  { value: "server", label: "Server", icon: Server },
  { value: "wifi", label: "Network", icon: Wifi },
  { value: "headphones", label: "Audio", icon: Headphones },
  { value: "camera", label: "Camera", icon: Camera },
  { value: "gamepad", label: "Gaming", icon: Gamepad },
  { value: "shield", label: "Security", icon: Shield },
  { value: "palette", label: "Design", icon: Palette },
];

const colorOptions = [
  { value: "bg-blue-100 text-blue-800", label: "Blue", hex: "#dbeafe" },
  { value: "bg-green-100 text-green-800", label: "Green", hex: "#dcfce7" },
  { value: "bg-yellow-100 text-yellow-800", label: "Yellow", hex: "#fef3c7" },
  { value: "bg-red-100 text-red-800", label: "Red", hex: "#fee2e2" },
  { value: "bg-purple-100 text-purple-800", label: "Purple", hex: "#f3e8ff" },
  { value: "bg-indigo-100 text-indigo-800", label: "Indigo", hex: "#e0e7ff" },
  { value: "bg-pink-100 text-pink-800", label: "Pink", hex: "#fce7f3" },
  { value: "bg-gray-100 text-gray-800", label: "Gray", hex: "#f3f4f6" },
  { value: "bg-orange-100 text-orange-800", label: "Orange", hex: "#fed7aa" },
  { value: "bg-teal-100 text-teal-800", label: "Teal", hex: "#ccfbf1" },
];

export function EquipmentCategoriesTags({
  equipmentId,
  onSelectionChange,
  selectedCategories = [],
  selectedTags = [],
  canManage = false,
}: EquipmentCategoriesTagsProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      color: "bg-blue-100 text-blue-800",
      icon: "monitor",
    },
  });

  const tagForm = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "bg-blue-100 text-blue-800",
    },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch("/api/equipment/categories"),
        fetch("/api/equipment/tags"),
      ]);

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(tagsData);
      }
    } catch (error) {
      console.error("Error fetching categories and tags:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmitCategory = async (data: CategoryFormData) => {
    try {
      const url = editingCategory ? `/api/equipment/categories/${editingCategory.id}` : "/api/equipment/categories";
      const method = editingCategory ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setIsCategoryDialogOpen(false);
        setEditingCategory(null);
        categoryForm.reset();
        fetchData();
      }
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  const onSubmitTag = async (data: TagFormData) => {
    try {
      const url = editingTag ? `/api/equipment/tags/${editingTag.id}` : "/api/equipment/tags";
      const method = editingTag ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setIsTagDialogOpen(false);
        setEditingTag(null);
        tagForm.reset();
        fetchData();
      }
    } catch (error) {
      console.error("Error saving tag:", error);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const response = await fetch(`/api/equipment/categories/${categoryId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const deleteTag = async (tagId: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;

    try {
      const response = await fetch(`/api/equipment/tags/${tagId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting tag:", error);
    }
  };

  const editCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
      color: category.color,
      icon: category.icon,
    });
    setIsCategoryDialogOpen(true);
  };

  const editTag = (tag: Tag) => {
    setEditingTag(tag);
    tagForm.reset({
      name: tag.name,
      description: tag.description || "",
      color: tag.color,
    });
    setIsTagDialogOpen(true);
  };

  const toggleCategory = (categoryId: string) => {
    if (!equipmentId) return;
    
    const newSelection = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    onSelectionChange?.(newSelection, selectedTags);
  };

  const toggleTag = (tagId: string) => {
    if (!equipmentId) return;
    
    const newSelection = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    
    onSelectionChange?.(selectedCategories, newSelection);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryIcon = (iconName: string) => {
    const iconData = categoryIcons.find(icon => icon.value === iconName);
    const IconComponent = iconData ? iconData.icon : FolderOpen;
    return <IconComponent className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Categories & Tags</h3>
          <p className="text-sm text-gray-600">Organize and classify equipment</p>
        </div>
        
        {canManage && (
          <div className="flex items-center space-x-2">
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Edit Category" : "Add Category"}
                  </DialogTitle>
                  <DialogDescription>
                    Create a new equipment category for better organization
                  </DialogDescription>
                </DialogHeader>
                <Form {...categoryForm}>
                  <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="space-y-4">
                    <FormField
                      control={categoryForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Laptops, Monitors" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={categoryForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Brief description of this category..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={categoryForm.control}
                        name="color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select color" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {colorOptions.map((color) => (
                                  <SelectItem key={color.value} value={color.value}>
                                    <div className="flex items-center space-x-2">
                                      <div
                                        className="w-4 h-4 rounded"
                                        style={{ backgroundColor: color.hex }}
                                      />
                                      <span>{color.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={categoryForm.control}
                        name="icon"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Icon</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select icon" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categoryIcons.map((icon) => {
                                  const IconComponent = icon.icon;
                                  return (
                                    <SelectItem key={icon.value} value={icon.value}>
                                      <div className="flex items-center space-x-2">
                                        <IconComponent className="h-4 w-4" />
                                        <span>{icon.label}</span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingCategory ? "Update" : "Create"} Category
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Tag className="h-4 w-4 mr-2" />
                  Add Tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTag ? "Edit Tag" : "Add Tag"}
                  </DialogTitle>
                  <DialogDescription>
                    Create a new tag for flexible equipment labeling
                  </DialogDescription>
                </DialogHeader>
                <Form {...tagForm}>
                  <form onSubmit={tagForm.handleSubmit(onSubmitTag)} className="space-y-4">
                    <FormField
                      control={tagForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., High-Priority, Remote-Work" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={tagForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Brief description of this tag..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={tagForm.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select color" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {colorOptions.map((color) => (
                                <SelectItem key={color.value} value={color.value}>
                                  <div className="flex items-center space-x-2">
                                    <div
                                      className="w-4 h-4 rounded"
                                      style={{ backgroundColor: color.hex }}
                                    />
                                    <span>{color.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsTagDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingTag ? "Update" : "Create"} Tag
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search categories and tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FolderOpen className="h-5 w-5" />
              <span>Categories</span>
              <Badge variant="secondary">{filteredCategories.length}</Badge>
            </CardTitle>
            <CardDescription>
              Equipment categories for organization and filtering
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No categories found</p>
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${
                      equipmentId && selectedCategories.includes(category.id) ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${category.color}`}>
                        {getCategoryIcon(category.icon)}
                      </div>
                      <div>
                        <h4 className="font-medium">{category.name}</h4>
                        {category.description && (
                          <p className="text-sm text-gray-600">{category.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {category.equipmentCount} items
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {equipmentId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCategory(category.id)}
                        >
                          {selectedCategories.includes(category.id) ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => editCategory(category)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteCategory(category.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Tag className="h-5 w-5" />
              <span>Tags</span>
              <Badge variant="secondary">{filteredTags.length}</Badge>
            </CardTitle>
            <CardDescription>
              Flexible tags for additional equipment classification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredTags.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Tag className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No tags found</p>
                </div>
              ) : (
                filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${
                      equipmentId && selectedTags.includes(tag.id) ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${tag.color}`}>
                        <Hash className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-medium">{tag.name}</h4>
                        {tag.description && (
                          <p className="text-sm text-gray-600">{tag.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {tag.usageCount} uses
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {equipmentId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTag(tag.id)}
                        >
                          {selectedTags.includes(tag.id) ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => editTag(tag)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteTag(tag.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}