const subDropdowns = document.querySelectorAll(".sub-dropdown");

if (window.innerWidth >= 992) {
  subDropdowns.forEach((subDropdown) => {
    subDropdown.addEventListener("mouseover", (e) => {
      subDropdown.children[1].style.display = "block";
    });
    subDropdown.addEventListener("mouseleave", (e) => {
      subDropdown.children[1].style.display = "none";
    });
  });

  subDropdowns.forEach((subDropdown) => {
    subDropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  });
}

const productsDropdowns = document.querySelectorAll(".products-dropdown");
productsDropdowns.forEach((pd) => {
  pd.addEventListener("mouseover", (e) => {
    pd.children[1].style.display = "flex";
    pd.children[1].style.opacity = "1";
  });
  pd.addEventListener("mouseleave", (e) => {
    pd.children[1].style.display = "none";
    pd.children[1].style.opacity = "0";
  });
});

const cartBtn = document.querySelector(".cart-btn");
const cart = document.querySelector(".cart");
if (cartBtn) {
  cartBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    cart.classList.toggle("hidden");
  });
}

const cartClose = document.querySelector(".cart-close");
if (cartClose) {
  cartClose.addEventListener("click", (e) => {
    e.stopPropagation();
    cart.classList.add("hidden");
  });
}

const productDropdownBtns = document.querySelectorAll("#dropdown-btn");

productDropdownBtns.forEach((pdb) => {
  pdb.addEventListener("click", (e) => {
    if (!e.target.parentElement.children[1]) return;

    e.target.parentElement.children[1].classList.toggle("h-full");
  });
});

if (window.innerWidth <= 992) {
  const dos = document.querySelectorAll(".dashboard-opener");
  const dss = document.querySelectorAll(".dashboard-sidebar");
  const dcs = document.querySelectorAll(".dashboard-closer");
  if (dos) {
    dos.forEach((da) => {
      da.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("btn clicked");
        dss.forEach((ds) => {
          ds.classList.toggle("dashboard-sidebar-show");
        });
      });
    });
  }
  if (dcs) {
    dcs.forEach((dc) => {
      dc.addEventListener("click", (e) => {
        e.preventDefault();
        dss.forEach((ds) => {
          ds.classList.toggle("dashboard-sidebar-show");
        });
      });
    });
  }
}

if (window.innerWidth <= 576) {
  if (document.querySelector(".all-products-sidebar-h1")) {
    document
      .querySelector(".all-products-sidebar-h1")
      .addEventListener("click", (e) => {
        document
          .querySelector(".all-products-sidebar-dropdown-container")
          .classList.toggle("all-products-sidebar-dropdown-container-show");
      });
  }
}

const stars = document.querySelectorAll(".star");
const clearStar = document.querySelector("#clear-star");
if (stars) {
  stars.forEach((star, index) => {
    star.addEventListener("click", (e) => {
      stars.forEach((st, i2) => {
        if (i2 <= index) {
          st.classList.remove("bi-star");
          st.classList.add("bi-star-fill", "fill");
        } else {
          st.classList.remove("bi-star-fill", "fill");
          st.classList.add("bi-star");
        }
      });
    });
  });
}

if (clearStar) {
  clearStar.addEventListener("click", (e) => {
    stars.forEach((st) => {
      st.classList.remove("bi-star-fill", "fill");
      st.classList.add("bi-star");
    });
  });
}

const showPass = document.querySelector("#showPass");
if (showPass) {
  showPass.addEventListener("click", (e) => {
    e.target.parentElement.parentElement.children[1].type == "text"
      ? (e.target.parentElement.parentElement.children[1].type = "password")
      : (e.target.parentElement.parentElement.children[1].type = "text");

    e.target.classList.replace("bi-eye-fill", "bi-eye-slash-fill") ||
      e.target.classList.replace("bi-eye-slash-fill", "bi-eye-fill");
  });
}
