/**
 * Ad Manager - Unified Sponsorship Engine
 * 
 * Automatically scans the DOM for elements with `data-sponsor-slot`
 * and injects the active premium sponsorship campaign into them.
 */

const AdManager = {
    // Current Active Campaign Config
    activeCampaign: {
        partnerName: 'Canada Student Financial Assistance',
        tagline: 'Federal & Provincial Student Grants',
        headline: 'Explore non-repayable Canada Student Grants & Provincial Aid.',
        ctaText: 'Explore Grants & Aid',
        ctaLink: 'https://www.canada.ca/en/services/benefits/education/student-aid/grants-loans.html',
        bannerImage: '/campuses/sponsor.png', // Relative path must work across pages
    },

    init: function() {
        document.addEventListener('DOMContentLoaded', () => {
            this.renderHeroSlots();
        });
        
        // Also run immediately in case DOM is already loaded
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            this.renderHeroSlots();
        }
    },

    getBannerImage: function() {
        return this.activeCampaign.bannerImage;
    },

    renderHeroSlots: function() {
        const slots = document.querySelectorAll('[data-sponsor-slot="hero"]');
        
        slots.forEach(slot => {
            // Only render once per slot
            if (slot.dataset.rendered === "true") return;
            
            const html = `
                <!-- Premium Inline Banner -->
                <div class="relative w-full h-32 rounded-3xl overflow-hidden shadow-lg border-2 border-emerald-300/40 group cursor-pointer" onclick="window.open('${this.activeCampaign.ctaLink}', '_blank')">
                    <img src="${this.getBannerImage()}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="${this.activeCampaign.tagline}">
                    <div class="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent"></div>
                    <div class="relative h-full flex flex-col justify-center px-8 z-10">
                        <span class="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Financial Aid Resource</span>
                        <h3 class="text-xl font-bold text-white font-lexend leading-tight mb-2 max-w-sm">${this.activeCampaign.headline}</h3>
                        <button class="w-fit text-xs font-black text-slate-900 bg-white hover:bg-slate-100 px-4 py-1.5 rounded-full transition-colors flex items-center gap-1">
                            ${this.activeCampaign.ctaText}
                            <span class="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    </div>
                </div>
            `;
            
            slot.innerHTML = html;
            slot.dataset.rendered = "true";
        });
    }
};

// Initialize automatically
AdManager.init();
