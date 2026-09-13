const categoriesContainerEl = document.querySelector(
  ".js-categories-container",
);
const container = document.querySelector(".js-food-container");
const footerContainer = document.querySelector("footer");
const searchBar = document.querySelector(".js-search-bar");
const recipeDisplayContainer = document.querySelector(
  ".js-food-recipe-display",
);
const favoriteMealEl = document.querySelector(".js-favorite-meals");
const searchButton = document.querySelector(".search-container button");
const navBar = document.querySelector("header nav");
let skip = 0;
let maxLen = 30;
let paginationScrollLeft = 0;

let filterCategory = null;
let categoriesList = null;
let searchFood = "";
let showingFavorites = false;

const foodsRecipeLists = [];
let allFavoriteRecipes = [];
const favoriteIds = JSON.parse(localStorage.getItem("favorite-id")) || [];

//Fetch data and generate html
async function fetchUrl(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (err) {
    console.error(err);
  }
}
async function getRecipeList(skip, maxLen) {
  if (!categoriesList) {
    const url = "https://www.themealdb.com/api/json/v1/1/list.php?c=list";

    const data = await fetchUrl(url);
    categoriesList = data.meals;
    createCategoriesHtml(categoriesList);
  }
  let results;
  if (!searchFood) {
    const categoryToFetch = filterCategory || categoriesList;
    results = await Promise.all(
      categoryToFetch.map(async (category) => {
        const res = await fetch(
          `https://www.themealdb.com/api/json/v1/1/filter.php?c=${category.strCategory}`,
        );

        return res.json();
      }),
    );
  } else {
    const data = await fetchUrl(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${searchFood}`,
    );
    results = [data];
  }

  const allRecipes = results.flatMap((data) => data.meals || []);

  const recipes = allRecipes.slice(skip, skip + maxLen);

  const recipesWithFavorite = recipes.map((recipe) => ({
    ...recipe,
    isFavorite: favoriteIds.includes(recipe.idMeal),
  }));

  foodsRecipeLists.length = 0;
  foodsRecipeLists.push(...recipesWithFavorite);

  return { foodsRecipeLists, allRecipes };
}
function generateFoodCardHtml(recipes) {
  container.innerHTML = "";
  recipes.forEach((recipe) => {
    const foodCard = document.createElement("div");
    foodCard.classList.add("food-card");
    foodCard.innerHTML = `
<div class="img-part">
  <img loading='lazy'
  src="${recipe.strMealThumb}"
  alt="${recipe.strMeal}"
  />
  <button class="make-favorite ${recipe.isFavorite ? "is-favorite" : ""} js-make-favorite" data-is-favorite='${recipe.idMeal}'>
  <i class="bi bi-heart icon"></i>
  <i class="bi bi-heart-fill icon"></i>
  </button>
  </div>
  <div class="food-data-container">
  <h1 class="food-name">${recipe.strMeal}</h1>
  <p class="food-origin">${recipe.strArea || ""} &dash; ${recipe.strCountry || ""}</p>
  <p><span class='view-more js-view-more' data-id='${recipe.idMeal}'>View More</span></p>
</div>
    `;
    container.appendChild(foodCard);
  });
}
container.addEventListener("click", (e) => {
  const favoriteButton = e.target.closest(".make-favorite");

  if (favoriteButton) {
    handleFavorite(favoriteButton);
    return;
  }

  const viewMoreButton = e.target.closest(".js-view-more");
  if (!viewMoreButton) return;
  const mealId = Number(viewMoreButton.dataset.id);
  const url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`;
  handleRecipe(url);
  recipeDisplayContainer.style.display = "block";
  container.style.display = "none";
  footerContainer.style.display = "none";
});

//create
function createCategoriesHtml(categories) {
  categoriesContainerEl.innerHTML = "";
  const ul = document.createElement("ul");
  ul.innerHTML = `<li class='active' data-id='all-0'>All</li>`;

  categories.forEach((category, i) => {
    const categoryListItem = document.createElement("li");
    categoryListItem.innerHTML = category.strCategory;
    categoryListItem.setAttribute(
      "data-id",
      `${category.strCategory}-${i + 1}`,
    );
    ul.appendChild(categoryListItem);
  });
  categoriesContainerEl.appendChild(ul);
}
categoriesContainerEl.addEventListener("click", async (e) => {
  const button = e.target.closest("li");
  if (!button) return;

  categoriesContainerEl.querySelectorAll("li").forEach((li) => {
    li.classList.remove("active");
  });
  button.classList.add("active");

  filterCategory =
    button.innerText === "All"
      ? null
      : [
          {
            strCategory: button.innerText,
          },
        ];

  searchFood = "";
  skip = 0;
  paginationScrollLeft = 0;
  hideRecipeDisplay();
  showingFavorites = false;
  renderPage();
});
function handleTab() {
  categoriesContainerEl.querySelectorAll("li").forEach((li) => {
    li.classList.remove("active");
    if (li.innerHTML === "All") {
      li.classList.add("active");
    }
  });
}

//Recipe Section
async function handleRecipe(url) {
  const data = await fetchUrl(url);
  const recipe = data.meals[0];
  let ingredientMeasure = [];
  // for (let i = 1; i <= 20; i++) {
  //   const ingredient = recipe[`strIngredient${i}`];
  //   const measure = recipe[`strMeasure${i}`];
  //   if (!ingredient.trim()) continue;
  //   ingredientMeasure.push({ ingredient, measure });
  // }

  //another way
  ingredientMeasure = Object.keys(recipe)
    .filter((key) => key.startsWith(`strIngredient`))
    .map((key) => {
      const index = Number(key.replace("strIngredient", ""));
      const ingredient = recipe[key];
      const measure = recipe[`strMeasure${index}`];
      if (!ingredient) return null;
      return { ingredient, measure };
    })
    .filter((ingredient) => ingredient !== null);

  const ingredientListHtml = createIngredientHtml(ingredientMeasure);

  let instructions = "";
  recipe.strInstructions.split(/\r?\n/).forEach((list, i) => {
    const text = list
      .replace(/^(?:S?TEP)[-\s]*\d+\s*:\s*/i, "")
      .replace(/^\d+\.\s*/, "")
      .trim();
    if (text && !/^step\s+\d+$/i.test(text))
      instructions += `<tr><td>STEP-${i + 1}</td> <td>${text}</td></tr>`;
  });

  recipeDisplayContainer.innerHTML = `
  <div class='recipe-header'>
    <img src='${recipe.strMealThumb}'>
    <div class='recipe-name-container'>
    <p class='recipe-name'>
    ${recipe.strMeal}
    </p>
    <p class='recipe-origin'>
    ${recipe.strArea || ""} &dash; ${recipe.strCountry || ""}
    </p>
    </div>
  </div>
  <div class='ingredients-list-container'>
  <h2>
  Ingredients and Measures
  </h2>
  ${ingredientListHtml}
  </div>
  <div class='recipe-instructions'>
  <table>
  <h2>
  Instructions
  </h2>
  ${instructions}
  </table>
  </div>
 <div class='buttons'>
  <button class='js-back-to-home-button'>
  <i class="bi bi-box-arrow-left"></i>
  <span>
  Leave
  </span>
  </button>
  <button class='js-watch-videos-button' data-videos-link="${recipe.strYoutube || ""}" ><i class="bi bi-youtube"></i> 
  <span>
   Watch Recipe Videos
  </span>
  </button>
 </div>
  `;
}
function createIngredientHtml(ingredientMeasure) {
  return `
  <table>
  <tbody>
  ${ingredientMeasure
    .map(
      ({ ingredient, measure }) => `<tr><td>${ingredient}</td>
    <td>${measure}</td></tr>`,
    )
    .join("")}
    </tbody>
  </table>
  `;
}
function hideRecipeDisplay() {
  recipeDisplayContainer.style.display = "none";
  container.style.display = "grid";
  footerContainer.style.display = "block";
}
recipeDisplayContainer.addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (!button) return;
  const backToHomeButton = button.classList.contains("js-back-to-home-button");
  const watchRecipeVideos = button.classList.contains("js-watch-videos-button");
  if (backToHomeButton) {
    hideRecipeDisplay();
    return;
  }
  if (watchRecipeVideos) {
    // window.location.href=button.dataset.videosLink;
    window.open(button.dataset.videosLink, "_blank", "noopener,noreferrer");
  }
});

//pagination
function createPagination(fullLength) {
  const oldButtonsPage = footerContainer.querySelector(".js-buttons-page");
  if (oldButtonsPage) {
    paginationScrollLeft = oldButtonsPage.scrollLeft;
  }
  footerContainer.innerHTML = "";
  const pageLength = Math.ceil(fullLength / maxLen);
  let html = "";

  for (let i = 0; i < pageLength; i++) {
    let skipVal = maxLen * i;
    html += `
    <button data-skip-value='${skipVal}' class='${skipVal === skip ? "active" : ""}'>${i + 1}</button>
    `;
  }
  const pagination = document.createElement("div");
  pagination.classList.add("pagination");
  pagination.innerHTML = `
    <button id='previous-page'><i class="bi bi-caret-left"></i></button>
    <div class='buttons-page js-buttons-page'>${html}</div>
    <button id='next-page'><i class="bi bi-caret-right"></i></button>
  `;

  footerContainer.appendChild(pagination);
  const buttonsPage = pagination.querySelector(".js-buttons-page");
  buttonsPage.scrollLeft = paginationScrollLeft;
  buttonsPage.addEventListener("scroll", updatePaginationButtons);
  updatePaginationButtons();
}
function handlePrevAndNext(button, buttonsPage) {
  if (button.id === "previous-page") {
    buttonsPage.scrollBy({
      left: -buttonsPage.clientWidth,
      behavior: "smooth",
    });
  } else if (button.id === "next-page") {
    buttonsPage.scrollBy({
      left: buttonsPage.clientWidth,
      behavior: "smooth",
    });
  }
}
function updatePaginationButtons() {
  const buttonsPage = footerContainer.querySelector(".js-buttons-page");
  const nextButton = document.getElementById("next-page");
  const prevButton = document.getElementById("previous-page");

  if (!buttonsPage || !nextButton || !prevButton) return;

  prevButton.disabled = buttonsPage.scrollLeft <= 0;

  nextButton.disabled =
    buttonsPage.scrollLeft + buttonsPage.clientWidth >=
    buttonsPage.scrollWidth - 1;
}
footerContainer.addEventListener("click", (e) => {
  const buttonsPage = footerContainer.querySelector(".js-buttons-page");
  const buttons = buttonsPage.querySelectorAll("button");
  const button = e.target.closest("button");
  if (!button || !buttonsPage) return;
  if (button.dataset.skipValue !== undefined) {
    skip = Number(button.dataset.skipValue);
    renderPage();
    return;
  }
  handlePrevAndNext(button, buttonsPage);
});

//Search bar
const debouncedFunction = debounce((value) => {
  searchFood = value;
  skip = 0;
  paginationScrollLeft = 0;
  renderPage();
}, 500);
function debounce(callback, delay = 500) {
  let timer;
  return function (...args) {
    clearTimeout(timer);

    timer = setTimeout(() => {
      callback.apply(this, args);
    }, delay);
  };
}
searchBar.addEventListener("input", (e) => {
  const text = e.target.value.trim();
  if (text === "" && window.innerWidth <= 430) {
    setTimeout(() => {
      navBar.classList.remove("search-active");
    }, 2000);
  }
  debouncedFunction(text);
  handleTab();
  hideRecipeDisplay();
  showingFavorites = false;
});

//For Favorite Recipes
async function getFavoriteRecipe() {
  const recipes = await Promise.all(
    favoriteIds.map(async (id) => {
      const data = await fetchUrl(
        `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`,
      );
      const recipe = data?.meals?.[0];

      if (!recipe) return null;
      return {
        ...recipe,
        isFavorite: true,
      };
    }),
  );
  return recipes.filter(Boolean);
}
async function renderFavoriteMeals() {
  if (!allFavoriteRecipes.length && favoriteIds.length) {
    allFavoriteRecipes = await getFavoriteRecipe();
  }
  return allFavoriteRecipes.slice(skip, skip + maxLen);
}
favoriteMealEl.addEventListener("click", () => {
  if (!favoriteIds.length) return (showingFavorites = false);
  showingFavorites = true;
  skip = 0;
  paginationScrollLeft = 0;
  handleTab();
  renderPage();
});
function handleFavorite(button) {
  const id = button.dataset.isFavorite;
  const currentRecipes = showingFavorites
    ? allFavoriteRecipes
    : foodsRecipeLists;

  const recipe = currentRecipes.find((recipe) => recipe.idMeal === id);

  if (!recipe) return;

  recipe.isFavorite = !recipe.isFavorite;

  if (recipe.isFavorite) {
    if (!favoriteIds.includes(recipe.idMeal)) {
      favoriteIds.push(recipe.idMeal);
    }
    button.classList.add("is-favorite");
  } else {
    const index = favoriteIds.indexOf(recipe.idMeal);

    if (index !== -1) {
      favoriteIds.splice(index, 1);
    }
    button.classList.remove("is-favorite");

    if (showingFavorites) {
      allFavoriteRecipes = allFavoriteRecipes.filter(
        (recipe) => recipe.idMeal !== id,
      );
    }
    if (skip >= allFavoriteRecipes.length && skip > 0) {
      skip -= maxLen;
    }
    if (!favoriteIds.length) showingFavorites = false;
    renderPage();
  }
  localStorage.setItem("favorite-id", JSON.stringify(favoriteIds));
}

//Render DOM
async function renderPage() {
  if (!showingFavorites) {
    const recipes = await getRecipeList(skip, maxLen);
    generateFoodCardHtml(recipes.foodsRecipeLists);
    createPagination(recipes.allRecipes.length);
  } else {
    const recipes = await renderFavoriteMeals();
    generateFoodCardHtml(recipes);
    createPagination(allFavoriteRecipes.length);
  }
  updatePaginationButtons();
}
window.addEventListener("DOMContentLoaded", async () => {
  renderPage();
});

//toggle search bar
searchButton.addEventListener("click", (e) => {
  if (window.innerWidth <= 430) {
    navBar.classList.add("search-active");
    searchBar.focus();
  }
});
