from django.shortcuts import render, get_object_or_404
from django.core.paginator import Paginator
from .models import Blog

def blog_list(request):
    """
    Display a paginated list of published blog posts.
    """
    posts = Blog.objects.filter(status='published').order_by('-created_at') 
    paginator = Paginator(posts, 10)  # 10 posts per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return render(request, 'blog/list.html', {
        'posts': page_obj,
        'page_obj': page_obj,
    })


def blog_detail(request, slug):
    """
    Display a single blog post identified by its slug.
    """
    post = get_object_or_404(Blog, slug=slug, status='published')
    
    # Get up to 10 other published posts excluding the current one
    other_posts = Blog.objects.filter(status='published').exclude(id=post.id).order_by('-created_at')[:10]

    return render(request, 'blog/detail.html', {
        'post': post,
        'other_posts': other_posts,
    })
