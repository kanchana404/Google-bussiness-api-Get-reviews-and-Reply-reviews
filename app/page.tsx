"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertCircle, 
  Star, 
  Send, 
  CheckCircle, 
  MessageCircle, 
  Calendar,
  Search,
  Filter,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Smile
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Interface for Google Review from API
interface GoogleReview {
  reviewId: string;
  reviewer: {
    profilePhotoUrl: string;
    displayName: string;
  };
  starRating: string;
  comment: string;
  createTime: string;
  updateTime: string;
  name: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

// Interface for review data (adapted for UI)
interface Review {
  id: string;
  customerName: string;
  customerAvatar: string;
  reviewDate: string;
  rating: number;
  comment: string;
  isReplied: boolean;
  replyDate: string | null;
  reply: string;
}

// Function to convert starRating string to number
const getRatingValue = (starRating: string): number => {
  switch (starRating.toUpperCase()) {
    case 'ONE': return 1;
    case 'TWO': return 2;
    case 'THREE': return 3;
    case 'FOUR': return 4;
    case 'FIVE': return 5;
    default: return 0;
  }
};

// Function to render stars based on rating
const RatingStars = ({ rating }: { rating: number }) => {
  const starsArray = [];
  const fullStars = Math.floor(rating);

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      starsArray.push(
        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      );
    } else {
      starsArray.push(
        <Star key={i} className="h-4 w-4 text-muted-foreground" />
      );
    }
  }

  return <div className="flex">{starsArray}</div>;
};

export default function GoogleBusinessReviews() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [sentiment, setSentiment] = useState("all");
  const [answered, setAnswered] = useState("all");
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const reviewsPerPage = 10;

  // Get environment variables
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

  // Validate environment variables
  if (!clientId) {
    console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set in environment variables');
  }
  if (!redirectUri) {
    console.error('NEXT_PUBLIC_GOOGLE_REDIRECT_URI is not set in environment variables');
  }

  // OAuth URL using environment variables
  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=code&scope=https://www.googleapis.com/auth/business.manage&redirect_uri=${encodeURIComponent(redirectUri || '')}&access_type=offline&prompt=consent`;

  // Check authentication status and URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    const message = urlParams.get('message');

    if (authStatus === 'success') {
      setStatusMessage('Successfully connected to Google Business!');
      setIsConnected(true);
      // Clean up URL
      window.history.replaceState({}, '', '/');
    } else if (authStatus === 'error') {
      setStatusMessage(`Connection failed: ${message || 'Unknown error'}`);
    }

    checkConnectionStatus();
  }, []);

  // Check if user is already connected
  const checkConnectionStatus = async () => {
    try {
      console.log('Checking connection status...');
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      
      console.log('Auth status response:', data);
      
      if (data.isAuthenticated) {
        console.log('User is authenticated, fetching accounts...');
        setIsConnected(true);
        fetchAccounts();
      } else {
        console.log('User is not authenticated');
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Direct redirect to OAuth URL
  const handleConnect = () => {
    if (!clientId || !redirectUri) {
      setStatusMessage('Google OAuth configuration is missing. Please check environment variables.');
      return;
    }
    window.location.href = oauthUrl;
  };

  // Disconnect from Google
  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/auth/status', { method: 'DELETE' });
      if (response.ok) {
        setIsConnected(false);
        setAccounts([]);
        setLocations([]);
        setReviews([]);
        setSelectedAccount('');
        setSelectedLocation('');
        setStatusMessage('Disconnected successfully');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      setStatusMessage('Failed to disconnect');
    }
  };

  // Fetch accounts
  const fetchAccounts = async () => {
    try {
      console.log('Fetching accounts...');
      const response = await fetch('/api/business?type=accounts');
      const data = await response.json();
      
      console.log('Accounts API response:', data);
      
      if (response.ok) {
        setAccounts(data.accounts || []);
        if (data.accounts?.length > 0) {
          setSelectedAccount(data.accounts[0].name);
          console.log('Selected account:', data.accounts[0].name);
        }
      } else {
        console.error('Accounts API error:', data);
        setStatusMessage('Failed to load accounts: ' + data.error);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setStatusMessage('Failed to load accounts');
    }
  };

  // Fetch locations for selected account
  useEffect(() => {
    if (!selectedAccount) return;

    async function fetchLocations() {
      try {
        console.log('Fetching locations for account:', selectedAccount);
        const response = await fetch(`/api/business?type=locations&accountName=${encodeURIComponent(selectedAccount)}`);
        const data = await response.json();
        
        console.log('Locations API response:', data);
        
        if (response.ok) {
          setLocations(data.locations || []);
          if (data.locations?.length > 0) {
            setSelectedLocation(data.locations[0].name);
            console.log('Selected location:', data.locations[0].name);
          }
        } else {
          console.error('Locations API error:', data);
          setStatusMessage('Failed to load locations: ' + data.error);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        setStatusMessage('Failed to load locations');
      }
    }

    fetchLocations();
  }, [selectedAccount]);

  // Fetch reviews for selected location
  useEffect(() => {
    if (!selectedLocation || !selectedAccount) return;

    async function fetchReviews() {
      setLoading(true);
      console.log('Fetching reviews for:', { selectedAccount, selectedLocation });
      
      try {
        const response = await fetch(`/api/business?type=reviews&locationName=${encodeURIComponent(selectedLocation)}&accountName=${encodeURIComponent(selectedAccount)}`);
        const data = await response.json();
        
        console.log('Reviews API response:', data);
        
        if (response.ok) {
          const mappedReviews: Review[] = (data.reviews || []).map((review: GoogleReview) => ({
            id: review.reviewId,
            customerName: review.reviewer.displayName,
            customerAvatar: review.reviewer.profilePhotoUrl,
            reviewDate: review.createTime,
            rating: getRatingValue(review.starRating),
            comment: review.comment || '',
            isReplied: !!review.reviewReply,
            replyDate: review.reviewReply ? review.reviewReply.updateTime : null,
            reply: review.reviewReply ? review.reviewReply.comment : '',
          }));
          
          console.log('Mapped reviews:', mappedReviews);
          setReviews(mappedReviews);
          setStatusMessage(`Loaded ${mappedReviews.length} reviews`);
        } else {
          console.error('Reviews API error:', data);
          setStatusMessage(data.message || 'Failed to load reviews: ' + data.error);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setStatusMessage('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, [selectedLocation, selectedAccount]);

  // Apply filters
  useEffect(() => {
    if (reviews.length === 0) return;

    let results = [...reviews];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        review =>
          review.customerName.toLowerCase().includes(term) ||
          review.comment.toLowerCase().includes(term)
      );
    }

    if (sentiment !== "all") {
      results = results.filter(review => {
        const reviewSentiment = review.rating >= 4 ? 'positive' : 'negative';
        return reviewSentiment === sentiment;
      });
    }

    if (answered !== "all") {
      results = results.filter(review =>
        answered === "replied" ? review.isReplied : !review.isReplied
      );
    }

    setFilteredReviews(results);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchTerm, sentiment, answered, reviews]);

  // Handle reply submission
  const handleReplySubmit = async (review: Review) => {
    if (!replyText.trim()) {
      setStatusMessage('Reply text cannot be empty');
      return;
    }

    try {
      const response = await fetch('/api/google-business-reply', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId: review.id,
          comment: replyText,
          accountName: selectedAccount,
          locationName: selectedLocation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit reply');
      }

      // Update local state to reflect the reply
      setReviews(prevReviews =>
        prevReviews.map(r =>
          r.id === review.id
            ? {
                ...r,
                isReplied: true,
                replyDate: new Date().toISOString(),
                reply: replyText,
              }
            : r
        )
      );

      setEditingReplyId(null);
      setReplyText("");
      setStatusMessage('Reply sent successfully to Google Business');
    } catch (error) {
      console.error('Error saving reply:', error);
      setStatusMessage('Failed to send reply: ' + error.message);
    }
  };

  // Start editing a reply
  const startEditing = (review: Review) => {
    setEditingReplyId(review.id);
    setReplyText(review.reply || '');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingReplyId(null);
    setReplyText('');
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * reviewsPerPage,
    currentPage * reviewsPerPage
  );

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading && !isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Google Business Reviews</h1>
          <p className="text-gray-600">Manage your Google Business Profile reviews</p>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
              <p className="text-blue-800">{statusMessage}</p>
            </div>
          </div>
        )}

        {!isConnected ? (
          // Connection Card
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Connect to Google Business</CardTitle>
              <CardDescription>
                Connect your Google Business Profile to view and manage reviews
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={handleConnect} className="w-full">
                Connect Google Business
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Controls */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Account Selection</CardTitle>
                  <Button variant="outline" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Select Account ({accounts.length} found)
                    </label>
                    <Select
                      value={selectedAccount}
                      onValueChange={(value) => {
                        setSelectedAccount(value);
                        setSelectedLocation('');
                        setReviews([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.name} value={account.name}>
                            {account.accountName || account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Select Location ({locations.length} found)
                    </label>
                    <Select
                      value={selectedLocation}
                      onValueChange={setSelectedLocation}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a location..." />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.name} value={location.name}>
                            {location.title || location.displayName || 'Unnamed Location'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Filters */}
                {reviews.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          type="search"
                          placeholder="Search reviews..."
                          className="pl-8"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      <Popover open={isFiltersVisible} onOpenChange={setIsFiltersVisible}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="gap-2">
                            <Filter className="h-4 w-4" />
                            Filters
                            {(sentiment !== "all" || answered !== "all") && (
                              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                Active
                              </Badge>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium">Review Filters</h4>
                              <p className="text-sm text-gray-500">
                                Filter reviews by different criteria
                              </p>
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="sentiment">Sentiment</Label>
                              <Select value={sentiment} onValueChange={setSentiment}>
                                <SelectTrigger id="sentiment">
                                  <SelectValue placeholder="Select sentiment" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Reviews</SelectItem>
                                  <SelectItem value="positive">
                                    <div className="flex items-center">
                                      <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
                                      <span>Positive</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="negative">
                                    <div className="flex items-center">
                                      <ThumbsDown className="mr-2 h-4 w-4 text-red-500" />
                                      <span>Negative</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="answered">Status</Label>
                              <Select value={answered} onValueChange={setAnswered}>
                                <SelectTrigger id="answered">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Statuses</SelectItem>
                                  <SelectItem value="replied">
                                    <div className="flex items-center">
                                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                      <span>Replied</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="pending">
                                    <div className="flex items-center">
                                      <MessageCircle className="mr-2 h-4 w-4 text-orange-500" />
                                      <span>Pending Reply</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex justify-between pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSearchTerm("");
                                  setSentiment("all");
                                  setAnswered("all");
                                }}
                              >
                                Reset All
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setIsFiltersVisible(false)}
                              >
                                Apply Filters
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p>Loading reviews...</p>
              </div>
            ) : filteredReviews.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    Reviews ({filteredReviews.length})
                    {filteredReviews.length !== reviews.length && (
                      <span className="text-sm text-gray-500 font-normal ml-2">
                        (filtered from {reviews.length} total)
                      </span>
                    )}
                  </h2>
                  <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
                
                {paginatedReviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={review.customerAvatar} alt={review.customerName} />
                            <AvatarFallback>
                              {review.customerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{review.customerName}</h3>
                            <p className="text-sm text-gray-500">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {formatDate(review.reviewDate)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <RatingStars rating={review.rating} />
                            <span className="text-sm font-medium">{review.rating.toFixed(1)}</span>
                            <Badge
                              variant="outline"
                              className={review.rating >= 4 
                                ? 'text-green-600 border-green-200' 
                                : 'text-red-600 border-red-200'
                              }
                            >
                              {review.rating >= 4 ? (
                                <div className="flex items-center">
                                  <ThumbsUp className="mr-1 h-3 w-3" />
                                  <span>Positive</span>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <ThumbsDown className="mr-1 h-3 w-3" />
                                  <span>Negative</span>
                                </div>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-700">{review.comment}</p>
                      </div>

                      <div className="ml-6 pl-4 border-l-2 border-gray-200">
                        {editingReplyId === review.id ? (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Your reply</label>
                            <Textarea
                              ref={textareaRef}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write your reply here..."
                              rows={3}
                              className="w-full resize-none"
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={cancelEditing}>
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleReplySubmit(review)}
                                disabled={!replyText.trim()}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Send
                              </Button>
                            </div>
                          </div>
                        ) : review.isReplied ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">Reply</Badge>
                              <span className="text-xs text-gray-500">
                                {formatDate(review.replyDate || '')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{review.reply}</p>
                            <div className="mt-2 flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => startEditing(review)}
                              >
                                Edit Reply
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-500">No reply yet</span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => {
                                setEditingReplyId(review.id);
                                setReplyText('');
                              }}
                            >
                              <MessageCircle className="mr-1 h-4 w-4" />
                              Reply
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        
                        <PaginationItem>
                          <PaginationNext 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                            }}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            ) : selectedLocation ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No reviews found</h3>
                <p className="text-gray-500">
                  {searchTerm || sentiment !== "all" || answered !== "all"
                    ? "Try adjusting your filters to see more results."
                    : "No reviews have been submitted for this location."}
                </p>
                {(searchTerm || sentiment !== "all" || answered !== "all") && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm("");
                      setSentiment("all");
                      setAnswered("all");
                    }}
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a location</h3>
                <p className="text-gray-500">
                  Please select a location to view reviews.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}